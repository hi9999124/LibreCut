import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "app.librecut.offline",
	appName: "LibreCut",
	webDir: "out",
	server: {
		androidScheme: "https",
	},
};

export default config;
