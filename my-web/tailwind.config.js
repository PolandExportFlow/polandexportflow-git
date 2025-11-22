/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./app/**/*.{js,ts,jsx,tsx}',
		'./pages/**/*.{js,ts,jsx,tsx}',
		'./components/**/*.{js,ts,jsx,tsx}',
		'./src/**/*.{js,ts,jsx,tsx}',
	],
	theme: {
		// Tutaj ustawiasz domyślny font dla całej aplikacji
		fontFamily: {
			sans: ['heeboRegular', 'sans-serif'], // Nadpisujesz domyślny sans font
		},
		extend: {
			fontFamily: {
				heebo_regular: ['heeboRegular', 'sans-serif'],
				heebo_medium: ['heeboMedium', 'sans-serif'],
				heebo_semibold: ['heeboSemiBold', 'sans-serif'],
				heebo_bold: ['heeboBold', 'sans-serif'],
				made_light: ['madeOuterLight', 'sans-serif'],
				made_regular: ['madeOuterRegular', 'sans-serif'],
				made_medium: ['madeOuterMedium', 'sans-serif'],
				made_bold: ['madeOuterBold', 'sans-serif'],
			},
			animation: {
				'ping-slow': 'ping 2s infinite',
			},
		},
		colors: {
			red: '#D72638',
			'light-red': '#F1737F',
			'dark-blue': '#05213C',
			'middle-blue': '#0A3864',
			'light-blue': '#E3ECF8',
			green: '#22C55E',
			white: '#FFFFFF',
			'ds-light-blue': '#f6f9ff',
			'ds-middle-blue': '#e8effc',
			'ds-border': '#cbd9ee',
			'ds-hover': '#e9f0ff',
		},
	},
	plugins: [],
}
