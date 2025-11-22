// app/components/pages/Faq.tsx
'use client'

import { useState } from 'react'

const faqData = [
    {
        category: 'Private Orders',
        items: [
            {
                question: 'Do you ship individual private packages?',
                answer: 'Yes, absolutely! We can send private parcels worldwide.',
            },
            {
                question: 'How long does order fulfillment take?',
                answer: 'It depends on the product and shipping method. Standard time: 3–7 days.',
            },
            {
                question: 'Can I order samples?',
                answer: 'Yes! We can provide samples upon request. Pricing depends on the product and shipping costs.',
            },
            {
                question: 'Can you find products not listed on marketplaces?',
                answer: 'Yes! If you can’t find a product, let us know — we’ll source it for you.',
            },
            {
                question: 'Can I request repackaging to reduce shipping costs?',
                answer: `Yes! We offer a repackaging service to optimize the size and weight of your shipment, helping you save on international shipping costs. If an item has excessive packaging, we can remove or consolidate it while ensuring proper protection. Just let us know your preferences when placing an order. `,
            },
        ],
    },
    {
        category: 'Business & Logistics',
        items: [
            {
                question: 'Which shipping methods do you offer?',
                answer: 'InPost International, UPS Standard/Express Saver, DHL Express.',
            },
            {
                question: 'What payment methods do you accept?',
                answer: 'PayPal, Wise, Revolut, ZEN.',
            },
            {
                question: 'Do you guarantee that all documents meet my country’s import regulations?',
                answer: 'No, the client is responsible for verifying the requirements with local authorities.',
            },
            {
                question: 'Can you provide additional certificates if required?',
                answer:
                    'Yes! We can provide additional certificates if required. Please contact us in advance, as processing times and additional fees may apply.',
            },
            {
                question: 'Since when have you been in business?',
                answer: 'We have been operating since 2025, backed by industry experience and strong supplier relationships.',
            },
        ],
    },
]

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<string | null>(null)

    const toggleAnswer = (index: string) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        // ZMIANA: Używamy klas z Twojego pliku Pricing.tsx
        <section className='section section-top'>
            <div className='wrapper w-full'>
                <h2>FAQ</h2>

                <div className='grid grid-cols-1 md:grid-cols-2 auto-rows-auto gap-2 mt-6'>
                    {faqData.map((section, sectionIdx) => (
                        <div key={sectionIdx} className='whiteCard col-span-1 row-span-1'>
                            <h3 className='mb-4'>{section.category}</h3>
                            <div className='space-y-2 mt-4'>
                                {section.items.map((item, index) => {
                                    const itemIndex = `${sectionIdx}-${index}`
                                    return (
                                        <div
                                            key={itemIndex}
                                            // ZMIANA: Używamy kolorów z Twojego motywu (light-blue)
                                            className={`border-b border-light-blue pb-2 transition-opacity duration-300 ${
                                                openIndex && openIndex !== itemIndex ? 'opacity-40' : 'opacity-100'
                                            }`}>
                                            <button
                                                // ZMIANA: Używamy kolorów z Twojego motywu (middle-blue)
                                                className='w-full font-heebo_regular text-middle-blue text-[12px] md:text-[14px] text-left flex justify-between items-center gap-2 py-3 hover:text-light-red transition duration-240'
                                                onClick={() => toggleAnswer(itemIndex)}>
                                                <span className='flex-1'>{item.question}</span>
                                                <span
                                                    className={`transition-transform duration-300 text-red ${
                                                        openIndex === itemIndex ? 'rotate-180' : 'rotate-0'
                                                    }`}>
                                                    <svg
                                                        xmlns='http://www.w3.org/2000/svg'
                                                        viewBox='0 0 357.554 357.554'
                                                        height='16'
                                                        width='16'
                                                        fill='currentColor'>
                                                        <path d='M25.092 44.165h307.034c20.256 0 32.547 23.67 20.94 40.058l-153.404 218.497c-9.786 13.884-31.408 14.566-41.651 0 0 0-153.175-218.269-153.403-218.497-11.608-15.933-.001-40.058 20.484-40.058zm258.099 50.983h-208.937l104.469 148.851z' />
                                                    </svg>
                                                </span>
                                            </button>
                                            <div
                                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                                    openIndex === itemIndex ? 'max-h-96' : 'max-h-0' // Zwiększono max-h
                                                }`}>
                                                {/* ZMIANA: Używamy koloru text-middle-blue/80 dla odpowiedzi */}
                                                <p className='mt-2 text-middle-blue/80'>{item.answer}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}