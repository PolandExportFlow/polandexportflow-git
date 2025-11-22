'use client'

import StepNumber from '@/components/common/StepNumber';
import React, { useEffect, useState, useRef } from 'react'

export default function OfficeRelocation() { // ZMIANA NAZWY FUNKCJI
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const [lineStyle, setLineStyle] = useState<{ top: number; height: number; dots: number[] }>({
        top: 0,
        height: 0,
        dots: [],
    })

    useEffect(() => {
        if (wrapperRef.current) {
            const steps = wrapperRef.current.querySelectorAll('.step')
            if (steps.length > 0) {
                const firstDiv = steps[0] as HTMLDivElement
                const lastDiv = steps[steps.length - 1] as HTMLDivElement

                const dots = Array.from(steps).map(step => {
                    const stepElement = step as HTMLDivElement
                    return stepElement.offsetTop + stepElement.offsetHeight / 2
                })

                const firstDivCenter = firstDiv.offsetTop + firstDiv.offsetHeight / 2
                const lastDivCenter = lastDiv.offsetTop + lastDiv.offsetHeight / 2

                setLineStyle({
                    top: firstDivCenter,
                    height: lastDivCenter - firstDivCenter,
                    dots,
                })
            }
        }
    }, [])

    return (
        <section className='section section-top'>
            <div ref={wrapperRef} className='wrapper w-full relative'>
                {/* ZMIANA: Tytuł */}
                <h2>How it works? - Office Relocation</h2>
                <div
                    className='hidden md:block absolute bg-red w-[2px] left-1/2 -translate-x-1/2'
                    style={{
                        top: `${lineStyle.top}px`,
                        height: `${lineStyle.height}px`,
                    }}>
                    {lineStyle.dots.map((dot, index) => {
                        const isLast = index === lineStyle.dots.length - 1
                        return (
                            <div
                                key={index}
                                className={`absolute bg-red ${
                                    isLast ? 'h-[2px] w-14 left-[calc(50% -2px)]' : 'rounded-full w-4 h-4 left-1/2 -translate-x-1/2'
                                }`}
                                style={{
                                    top: `${dot - lineStyle.top}px`,
                                }}></div>
                        )
                    })}
                </div>

                {/* Krok 1: NOWA TREŚĆ */}
                <div className='step'>
                    <div className='whiteCard md:w-[46%]'>
                        <div className='flex flex-row items-center'>
                            <div className='stepCircle border-middle-blue'>
                                <span className='stepNumber'>1</span>
                            </div>
                            <h3 className='mb-4 md:mb-6'>Consultation & Planning</h3>
                        </div>
                        <p>
                            Every office move is unique. We start with a detailed consultation to understand your inventory, sensitive equipment, and timeline.
                            <br /><br />
                            We plan the entire logistics process, from professional packing in Poland to setup at your new international location.
                        </p>
                    </div>
                    <StepNumber number={1} />
                </div>

                {/* Krok 2: NOWA TREŚĆ */}
                <div className='step'>
                    <StepNumber number={2} />
                    <div className='relative w-full whiteCard md:w-[46%]'>
                        <div className='flex flex-row items-center'>
                            <div className='stepCircle border-middle-blue'>
                                <span className='stepNumber'>2</span>
                            </div>
                            <h3 className='mb-4 md:mb-6'>Professional Packing & Inventory</h3>
                        </div>
                        <p>
                            Our team arrives to professionally pack all office furniture, IT equipment, and documents. We create a detailed inventory list for customs and tracking.
                        </p>
                        <ul className='list-disc pt-4 pl-10'>
                            <li>Specialized crates for sensitive electronics and monitors.</li>
                            <li>Secure handling of confidential files and archives.</li>
                            <li>Detailed labeling for easy unpacking and setup.</li>
                        </ul>
                    </div>
                </div>

                {/* Krok 3: NOWA TREŚĆ */}
                <div className='step'>
                    <div className='whiteCard md:w-[46%]'>
                        <div className='flex flex-row items-center'>
                            <div className='stepCircle border-middle-blue'>
                                <span className='stepNumber'>3</span>
                            </div>
                            <h3 className='mb-4 md:mb-6'>Customs & Freight Shipping</h3>
                        </div>
                        <p>
                            Office relocation involves complex customs paperwork. We handle all export and import documentation to ensure compliance.
                            <br /><br />
                            We utilize dedicated freight options (air, sea, or land) optimized for your budget and timeline, ensuring your assets arrive safely.
                        </p>
                        <div className='my-6 flex flex-wrap gap-x-12 gap-y-8 items-center justify-center'>
                            {/* Możesz tu dodać logo firm spedycyjnych/logistycznych */}
                            <img src='/img/carriers/glsPEF.svg' alt='GLS' className='h-4 lg:h-5 carrierIcon' />
                            <img src='/img/carriers/upsPEF.svg' alt='UPS' className='h-6 lg:h-7 carrierIcon' />
                            <img src='/img/carriers/FedExPEF.svg' alt='FedEx' className='h-5 lg:h-7 carrierIcon' />
                            <img src='/img/carriers/dhlPEF.svg' alt='DHL' className='h-4 lg:h-7 carrierIcon' />
                        </div>
                    </div>
                    <StepNumber number={3} />
                </div>

                {/* Krok 4: NOWA TREŚĆ */}
                <div className='step'>
                    <StepNumber number={4} />
                    <div className='relative bg-red text-white p-6 md:p-8 md:w-[46%]'>
                        <div className='flex flex-row items-center'>
                            <div className='stepCircle border-white '>
                                <span className='font-made_bold text-white text-[14px]'>4</span>
                            </div>
                            <h3 className='mb-4 md:mb-6 h3-white'>Delivery & Unpacking</h3>
                        </div>
                        <p className='p-white'>
                            We coordinate the final delivery to your new office. Our service can include unpacking, setup of workstations, and removal of all packing materials, minimizing your downtime.
                        </p>
                        <img
                            src='/img/TrackingNumber.svg' // Możesz zmienić to logo na bardziej pasujące do relokacji
                            alt='Tracking code'
                            className='w-[90%] lg:w-[70%] mt-2 lg:mt-0 block mx-auto'
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}