import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";

const config: Config = {
	title: "Gooi Docs",
	tagline: "Product and platform documentation",
	favicon: "img/favicon.ico",

	url: "https://ngalluzzo.github.io",
	baseUrl: "/gooi/",

	organizationName: "ngalluzzo",
	projectName: "gooi",

	onBrokenLinks: "throw",
	markdown: {
		hooks: {
			onBrokenMarkdownLinks: "throw",
		},
	},

	i18n: {
		defaultLocale: "en",
		locales: ["en"],
	},

	presets: [
		[
			"classic",
			{
				docs: {
					sidebarPath: "./sidebars.ts",
					routeBasePath: "/",
					editUrl: "https://github.com/ngalluzzo/gooi/tree/main/apps/docs/",
				},
				blog: false,
				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	themeConfig: {
		image: "img/gooi-social-card.jpg",
		navbar: {
			title: "Gooi",
			items: [
				{
					type: "docSidebar",
					sidebarId: "main",
					position: "left",
					label: "Docs",
				},
				{
					href: "https://github.com/ngalluzzo/gooi",
					label: "GitHub",
					position: "right",
				},
			],
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
