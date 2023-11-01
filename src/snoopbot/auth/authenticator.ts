import puppeteer from "puppeteer"
import dotenv from "dotenv"
import { writeFileSync } from "fs";

import Logger from "../utils/logger";
dotenv.config()

export default class Authenticator {
    public constructor() {}

    /**
     * Creates a session file that is fetched
     * from facebook based on the provided
     * email address and password.
     * 
     * @source https://github.com/jersoncarin/fb-chat-command/blob/main/cli.js
     * @return Promise<void>
     */
    public static async authenticate() : Promise<void> {
        if(!process.env.FB_EMAIL || !process.env.FB_PASS) {
            throw new Error("No facebook credentials were found. Please see documentation on how to configure your facebook credentials.")
        }

        const email: string = process.env.FB_EMAIL;
        const paswd: string = process.env.FB_PASS;

        return await (async () => {
            const browser = await puppeteer.launch({
                headless: "new"
            });

            try {
                const page = await browser.newPage();

                Logger.muted("Parsing facebook login credentials...");

                await page.goto("https://www.facebook.com/");

                await page.waitForSelector("#email");
                await page.type("#email", email);
                await page.type("#pass", paswd);
                await page.click("button[name='login']");

                Logger.muted("Trying to authenticate...");

                await page.waitForSelector("div[role=main]");

                let cookies = await page.cookies();
                let parsedCookies = cookies.map(({name: key, ...rest}) => ({key, ...rest}));

                let cookieString = JSON.stringify(parsedCookies);

                Logger.muted("Writing session file...");

                writeFileSync("state.session", Buffer.from(cookieString).toString("base64"));

                Logger.success("Session file has been created!");
                Logger.success("Starting snoopbot...");
            } catch(error: any) {
                if(error instanceof Error) {
                    let errMessage = error.message;

                    if(errMessage.includes('div[role=main]')) {
                        Logger.error(`Invalid email address or password. If your account has 2FA enabled, please disable it. ${errMessage}`);
                    } else {
                        Logger.error("Error: " + errMessage);
                    }
                } else {
                    Logger.error("Error: " + error);
                }
            }

            await browser.close();
        })();
    }
}