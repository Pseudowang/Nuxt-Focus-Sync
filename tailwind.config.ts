import type { Config } from 'tailwindcss'

export default <Config>{
    theme: {
        extend: {
            colors: {
                primary: '#FF7F50', // Coral
                secondary: '#FFA07A', // Light Salmon
                accent: '#FF4500', // Orange Red
                background: '#FFF5EE', // Seashell
                surface: '#FFFFFF',
                text: '#4A4A4A', // Dark Gray for text
                'text-light': '#808080',
            }
        }
    }
}
