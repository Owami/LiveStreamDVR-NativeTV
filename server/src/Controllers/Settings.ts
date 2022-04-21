import express from "express";
import type { ApiSettingsResponse } from "../../../common/Api/Api";
// import type { SettingField } from "../../../common/Config";
import { version } from "../../package.json";
import { TwitchChannel } from "../Core/TwitchChannel";
import { Config } from "../Core/Config";
import { TwitchGame } from "../Core/TwitchGame";
import { Helper } from "../Core/Helper";

export function GetSettings(req: express.Request, res: express.Response): void {

    const config: Record<string, any> = {};
    for (const key in Config.config) {
        config[key] = Config.cfg(key);
    }

    res.send({
        data: {
            config: config,
            channels: TwitchChannel.channels_config,
            favourite_games: TwitchGame.favourite_games,
            fields: Config.settingsFields,
            version: version,
            server: "ts-server",
            websocket_url: Config.getWebsocketClientUrl(),
            errors: Helper.getErrors(),
        },
        status: "OK",
    } as ApiSettingsResponse);
}

export async function SaveSettings(req: express.Request, res: express.Response): Promise<void> {

    let force_new_token = false;
    if (Config.cfg("api_client_id") !== req.body.api_client_id) {
        force_new_token = true;
    }

    // @todo: don't set config values unless everything is valid, like the http check

    let fields = 0;
    for(const setting of Config.settingsFields) {
        const key = setting.key;
        if (setting.required && !req.body[key]) {
            res.status(400).send({
                status: "ERROR",
                message: `Missing required setting: ${key}`,
            });
            return;
        }
        if (req.body[key] !== undefined) {
            fields++;
        }
    }

    if (fields == 0) {
        res.status(400).send({
            status: "ERROR",
            message: "No settings to save",
        });
        return;
    }

    // verify app_url
    if (req.body.app_url !== undefined && req.body.app_url !== "debug") {

        const test_url = req.body.app_url;

        let url_ok;
        try {
            url_ok = await Config.validateExternalURL(test_url);
        } catch (error) {
            res.send({
                status: "ERROR",
                message: `External URL is invalid: ${(error as Error).message}`,
            });
            return;
        }

    }

    for(const setting of Config.settingsFields) {
        const key = setting.key;
        if (setting.type === "boolean") {
            Config.setConfig<boolean>(key, req.body[key] !== undefined);
        } else if (setting.type === "number") {
            if (req.body[key] !== undefined) {
                Config.setConfig<number>(key, parseInt(req.body[key]));
            }
        } else {
            if (req.body[key] !== undefined) {
                Config.setConfig(key, req.body[key]);
            }
        }
    }

    Config.saveConfig("settings form saved");

    if (force_new_token) {
        Helper.getAccessToken(true);
    }

    res.send({
        message: "Settings saved",
        status: "OK",
    });

    return;
}