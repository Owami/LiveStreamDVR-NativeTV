<template>
    <form method="POST" enctype="multipart/form-data" action="#" @submit="submitForm" v-if="settingsFields && settingsData">
        <details class="settings-details" v-for="groupData in settingsGroups" v-bind:key="groupData.name">
            <summary>{{ groupData.name }}</summary>
            <div class="field" v-for="(data, index) in groupData.fields" v-bind:key="index">
                <label v-if="data.type != 'boolean'" class="label" :for="'input_' + data.key">
                    {{ data.text }}
                    <span v-if="data.deprecated" class="is-small is-error">Deprecated</span>
                </label>

                <!-- boolean -->
                <div v-if="data.type == 'boolean' && settingsData" class="control">
                    <label class="checkbox">
                        <input
                            type="checkbox"
                            :name="data.key"
                            :id="'input_' + data.key"
                            :checked="configValue(data.key) !== undefined ? configValue(data.key) as boolean : data.default as boolean"
                        />
                        {{ data.text }}
                    </label>
                </div>

                <!-- string -->
                <div v-if="data.type == 'string'" class="control">
                    <input
                        class="input"
                        type="text"
                        :name="data.key"
                        :id="'input_' + data.key"
                        :value="configValue(data.key) !== undefined ? configValue(data.key) : data.default"
                        :title="data.help"
                        :pattern="data.pattern"
                    />
                </div>

                <!-- number -->
                <div v-if="data.type == 'number'" class="control">
                    <input
                        class="input"
                        type="number"
                        :name="data.key"
                        :id="'input_' + data.key"
                        :value="configValue(data.key) !== undefined ? configValue(data.key) : data.default"
                    />
                </div>

                <!-- array -->
                <div v-if="data.type == 'array'" class="control">
                    <!--<input class="input" :name="key" :id="key" :value="settings[key]" />-->
                    <select class="input" :name="data.key" :id="'input_' + data.key" v-if="data.choices">
                        <option
                            v-for="(item, ix) in data.choices"
                            :key="ix"
                            :selected="
                                (configValue(data.key) !== undefined && configValue(data.key) === item) ||
                                (configValue(data.key) === undefined && item === data.default)
                            "
                        >
                            {{ item }}
                        </option>
                    </select>
                </div>
                <p v-if="data.help" class="input-help">{{ data.help }}</p>
                <p v-if="data.default" class="input-help">Default: {{ data.default }}</p>
            </div>
        </details>

        <div class="control">
            <hr />
            <button class="button is-confirm" type="submit">
                <span class="icon"><fa icon="save"></fa></span> Save
            </button>
            <span :class="formStatusClass">{{ formStatusText }}</span>
        </div>
    </form>
</template>

<script lang="ts">
import { useStore } from "@/store";
import { ApiResponse } from "@common/Api/Api";
import { SettingField } from "@common/Config";
import { AxiosError } from "axios";
import { defineComponent, PropType } from "vue";

interface SettingsGroup {
    name: string;
    fields: SettingField<string | number | boolean>[];
}

export default defineComponent({
    name: "SettingsForm",
    props: {
        settingsData: {
            type: Object as PropType<Record<string, string | number | boolean>>,
        },
        settingsFields: {
            type: Array as PropType<SettingField<string | number | boolean>[]>,
        },
    },
    setup() {
        const store = useStore();
        return { store };
    },
    emits: ["formSuccess"],
    data() {
        return {
            formStatusText: "Ready",
            formStatus: "",
            formData: {},
        };
    },
    mounted(): void {
        // this.settingsCopy = JSON.parse(JSON.stringify(this.store.config));
    },
    /*
    created: {
        this.formData = this.settingsData;
    },
    */
    methods: {
        submitForm(event: Event) {
            const form = event.target as HTMLFormElement;
            const inputs = new FormData(form);

            this.formStatusText = "Loading...";
            this.formStatus = "";

            // console.log("form", form);
            // console.log("entries", inputs, inputs.entries(), inputs.values());
            let data: Record<string, unknown> = {};
            inputs.forEach((value, key) => (data[key] = value));

            this.$http
                .put(`/api/v0/settings`, data)
                .then((response) => {
                    const json: ApiResponse = response.data;
                    this.formStatusText = json.message || "No message";
                    this.formStatus = json.status;
                    if (json.message) alert(json.message);
                    if (json.status == "OK") {
                        this.$emit("formSuccess", json);
                    }
                    console.debug("settings save response", response);
                })
                .catch((err: AxiosError) => {
                    console.error("form error", err.response);
                    this.formStatusText = err.response?.data ? err.response.data.message : "Fatal error";
                    // this.formStatusText = err.response.message ? err.response.message : "Fatal error";
                    this.formStatus = "ERROR";
                });

            event.preventDefault();
            return false;
        },
        configValue(key: string): string | number | boolean | undefined {
            if (!this.settingsData) return undefined;
            // const k: keyof ApiConfig = key as keyof ApiConfig;
            // return this.settingsData[k] as unknown as T;
            return this.settingsData[key];
        },
    },
    computed: {
        settingsGroups(): SettingsGroup[] {
            if (!this.settingsFields) return [];
            const groups: Record<string, SettingsGroup> = {};
            for (const field of this.settingsFields) {
                if (!field.group) continue;
                if (!groups[field.group]) groups[field.group] = { name: field.group, fields: [] };
                groups[field.group].fields.push(field);
            }
            return Object.values(groups);
        },
        /*
        settingsGroups(): Record<string, ApiSettingsField[]> {
            if (!this.settingsFields) return {};
            let data: Record<string, ApiSettingsField[]> = {};

            for (const key in this.settingsFields) {
                const field = this.settingsFields[key];
                if (!data[field.group]) data[field.group] = [];
                data[field.group].push(field);
            }
            console.log("settingsGroups", data);

            data = Object.keys(data)
                .sort()
                .reduce((obj: any, key) => {
                    obj[key] = data[key];
                    return obj;
                }, {});

            console.log("settingsGroups sort", data);
            return data;
        },
        */
        formStatusClass(): Record<string, boolean> {
            return {
                "form-status": true,
                "is-error": this.formStatus == "ERROR",
                "is-success": this.formStatus == "OK",
            };
        },
    },
});
</script>