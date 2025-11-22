// /src/data/serviceConfig.ts (Nowy plik do zarządzania danymi)

export type ServiceStep = {
    title: string;
    description: string | React.ReactNode;
    details?: {
        list?: string[];
        images?: { src: string; alt: string; className?: string }[];
    }
};

export type ServiceConfig = {
    id: string;
    title: string;
    subtitle: string;
    path: string;
    steps: ServiceStep[];
};

// Stała, którą przeniesiesz do pliku konfiguracyjnego
export const ALL_SERVICES: ServiceConfig[] = [
    {
        id: 'parcel-forwarding',
        title: 'Parcel Forwarding (Mail Forwarding)',
        subtitle: 'Shop Polish stores and ship worldwide.',
        path: '/how-it-works/parcel-forwarding',
        steps: [
            {
                title: 'Submit a Request',
                description: 'Send us details about the products you want to purchase or ship. You can order from any Polish store, marketplace, or supplier.',
                details: { list: ['Once you choose a product, we’ll handle the sourcing and logistics.'] }
            },
            // ... (Krok 2, 3, 4 z obecnego kodu)
        ]
    },
    {
        id: 'assisted-purchase',
        title: 'Assisted Purchase (We Buy & Ship)',
        subtitle: 'We purchase products on your behalf.',
        path: '/how-it-works/assisted-purchase',
        steps: [
            // ... (tutaj będą kroki dla Assisted Purchase)
        ]
    },
    // ... (office-relocation, pickup-service, product-inspection)
];