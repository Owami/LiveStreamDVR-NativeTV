import path from "path";
import fs from "fs";
import { BaseConfigFolder } from "./BaseConfig";
import { LOGLEVEL, TwitchLog } from "./TwitchLog";
import { PHPDateTimeProxy } from "@/types";
import { TwitchHelper } from "./TwitchHelper";
import { parse } from "date-fns";

export interface TwitchAutomatorJobJSON {
    name: string;
    pid: number;
    metadata: any;
    dt_started_at: PHPDateTimeProxy;
}

export class TwitchAutomatorJob
{

	static readonly NO_FILE = 1;
	static readonly NO_DATA = 2;

    /*
	public string $name;
	public $pid;
	public string $pidfile;
	public string $pidfile_simple;
	public array $metadata = [];
	public $status;
	public int $error;
	public Process $process;
	public ?\DateTime $dt_started_at;
    */

    public name: string | undefined;
    public pid: number | undefined;
    public pidfile: string | undefined;
    public pidfile_simple: string | undefined;
    public metadata: any | undefined;
    public status: number | false | undefined;
    public error: number | undefined;
    // public process: any | undefined;
    public dt_started_at: Date | undefined;	

	private realpath(str: string): string {
		return path.normalize(str);
	}

	public static create(name: string): TwitchAutomatorJob
	{

        const basepath = path.join(BaseConfigFolder.pids, name);

		// if(file_exists(TwitchHelper::$pids_folder . DIRECTORY_SEPARATOR . $name . ".json")){
		// 	TwitchLog.logAdvanced(LOGLEVEL.WARNING, "job", "Creating job {$name} overwrites existing!");
		// }
        if (!fs.existsSync(path.join(basepath, name + ".json"))) {
            TwitchLog.logAdvanced(LOGLEVEL.WARNING, "job", "Creating job {$name} overwrites existing!");
        }

		let job = new this();
		job.name = name;
		job.pidfile = job.realpath(path.join(basepath, name + ".json"));
		job.pidfile_simple = job.realpath(path.join(basepath, name + ".pid"));
		job.dt_started_at = new Date();
		
		return job;
	}

	public static load(name: string): TwitchAutomatorJob | false
	{

        const basepath = path.join(BaseConfigFolder.pids, name);

		let job = new this();
		job.name = name;
		job.pidfile = job.realpath(path.join(basepath, name + ".json"));
		job.pidfile_simple = job.realpath(path.join(basepath, name + ".pid"));
		job.dt_started_at = new Date();

		// if no pid file
		if (!fs.existsSync(job.pidfile)) {
			TwitchLog.logAdvanced(LOGLEVEL.ERROR, "job", `Loading job ${job.name} failed, no json file`, job.metadata);
			// return job.loadSimple();
			job.error = this.NO_FILE;
			return false;
		}

		// read pid file
		const raw = fs.readFileSync(job.pidfile, "utf8");
		if (!raw) {
			TwitchLog.logAdvanced(LOGLEVEL.ERROR, "job", `Loading job ${job.name} failed, no data in json file`, job.metadata);
			job.error = this.NO_DATA;
			return false;
		}

		const data: TwitchAutomatorJobJSON = JSON.parse(raw);

		job.pid = data.pid;

		job.dt_started_at = data.dt_started_at ? parse(data.dt_started_at.date, TwitchHelper.PHP_DATE_FORMAT, new Date()) : undefined;

		// TwitchLog.logAdvanced(LOGLEVEL.DEBUG, "job", "Job {$this->name} loaded, proceed to get status.", $this->metadata);

		// $this->getStatus();
		return job;
		
	}

	/**
	 * Save to disk, like when the process starts
	 *
	 * @return bool
	 */
	save()
	{
        if (!this.pidfile) {
            throw new Error("pidfile not set");
        }

		TwitchLog.logAdvanced(LOGLEVEL.INFO, "job", `Save job ${this.name} with PID ${this.pid}`, this.metadata);

		TwitchHelper.webhook({
			'action': 'job_save',
			'job_name': this.name,
			'job': this
        });

		//return file_put_contents($this->pidfile, json_encode($this)) != false;
        fs.writeFileSync(this.pidfile, JSON.stringify(this), "utf8");
        return fs.existsSync(this.pidfile);
	}

	/**
	 * Remove from disk, like when the process quits
	 *
	 * @return bool success
	 */
	clear()
	{
		// if (this.process) {
		// 	this.process = null;
		// }

        if (!this.pidfile) {
            throw new Error("pidfile not set");
        }

		if (fs.existsSync(this.pidfile)) {
			TwitchLog.logAdvanced(LOGLEVEL.INFO, "job", `Clear job ${this.name} with PID ${this.pid}`, this.metadata);
			
			TwitchHelper.webhook({
				'action': 'job_clear',
				'job_name': this.name,
				'job': this
            });

            fs.unlinkSync(this.pidfile);
            return !fs.existsSync(this.pidfile);
		}
		return false;
	}

	/**
	 * Set process PID
	 *
	 * @param int $pid
	 * @return void
	 */
	setPid(pid: number)
	{
		this.pid = pid;
	}

	/**
	 * Get process PID
	 *
	 * @return int Process ID
	 */
	getPid()
	{
		// if (!$this->pid) {
		// 	$this->load();
		// }
		return this.pid;
	}

	/**
	 * Attach process
	 *
	 * @param Process $process
	 * @return void
	 */
	setProcess(process: any)
	{
		// $this->process = $process;
	}

	/**
	 * Attach metadata
	 *
	 * @param array $metadata
	 * @return void
	 */
	setMetadata(metadata: any)
	{
		this.metadata = metadata;
	}

	/**
	 * Get running status of job, PID if running.
	 *
	 * @return int|false
	 */
	async getStatus()
	{
		TwitchLog.logAdvanced(LOGLEVEL.DEBUG, "job", `Check status for job ${this.name}`, this.metadata);

		if (!this.pid) {
			throw new Error("No pid set on job");
		}

		const output = await TwitchHelper.exec(["ps", "-p", this.pid.toString()]);

        /*
		if (mb_strpos($output, (string)$this->pid) !== false) {
			TwitchLog.logAdvanced(LOGLEVEL.DEBUG, "job", "PID file check for '{$this->name}', process is running");
			$this->status = $this->pid;
			return $this->pid;
		} else {
			TwitchLog.logAdvanced(LOGLEVEL.DEBUG, "job", "PID file check for '{$this->name}', process does not exist");
			$this->status = false;
			return false;
		}
        */
        if (output.indexOf(this.pid.toString()) !== -1) {
            TwitchLog.logAdvanced(LOGLEVEL.DEBUG, "job", "PID file check for '{this.name}', process is running");
            this.status = this.pid;
            return this.pid;
        } else {
            TwitchLog.logAdvanced(LOGLEVEL.DEBUG, "job", "PID file check for '{this.name}', process does not exist");
            this.status = false;
            return false;
        }
	}

	/**
	 * Quit the process via PID
	 *
	 * @return string kill output
	 */
	kill()
	{
		// if (this.process) {
		// 	return this.process.stop();
		// }

        const pid = this.getPid();

        if (!pid) {
            return false;
        }

		const exec = TwitchHelper.exec(["kill", pid.toString()]);
		this.clear();
		return exec;
	}
}
