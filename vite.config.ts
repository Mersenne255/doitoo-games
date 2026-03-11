import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}']
            },
            manifest: {
                name: 'Doitoo Memory Game',
                short_name: 'Doitoo Memory',
                description: 'Memory game built with Lit',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: '/icons/favicon.png',
                        sizes: '1024x1024',
                        type: 'image/png'
                    },
                    {
                        src: '/icons/favicon.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: '/icons/favicon.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/icons/favicon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
    server: {
        host: '0.0.0.0'
    }
});