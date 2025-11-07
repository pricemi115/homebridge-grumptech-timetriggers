import { defineConfig, globalIgnores } from "eslint/config";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores(["dist/homegridge-grumptech-timetriggers.js", "src/tests/"], "Ignore Build Output and Tests"),
    {
        plugins: {
            jsdoc
        },

        languageOptions: {
            globals: {
                ...globals.node,
            },

            ecmaVersion: "latest",
            sourceType: "module",
        },

        rules: {
            "no-underscore-dangle": "off",
            "no-multi-spaces": "off",

            indent: ["error", 4, {
                SwitchCase: 1,
            }],

            "space-unary-ops": ["error", {
                words: true,

                overrides: {
                    typeof: false,
                },
            }],

            "brace-style": ["error", "stroustrup"],
            "operator-linebreak": ["error", "after"],
            "no-lone-blocks": "off",
            "no-restricted-syntax": "off",

            "max-len": ["error", {
                code: 200,
            }],

            "jsdoc/require-returns": ["error", {
            }],

            "jsdoc/no-undefined-types": [1, {
                definedTypes: ["debug", "is-it-check", "events", "https", "crypto", "grumptech-astrodata"],
            }],
        },

        "settings": {
            "jsdoc": {
                "tagNamePreference": {
                    "param": "arg",
                    "returns": "returns"
                }
            }
        },
    },
]);