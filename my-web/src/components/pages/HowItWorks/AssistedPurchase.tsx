'use client'

import StepNumber from '@/components/common/StepNumber';
import React, { useEffect, useState, useRef } from 'react'

export default function AssistedPurchase() { // ZMIANA NAZWY FUNKCJI
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
                <h2>How it works? - Assisted Purchase</h2>
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
                            <h3 className='mb-4 md:mb-6'>Send Us Your Shopping List</h3>
                        </div>
                        <p>
                            You provide us with the links, photos, or descriptions of the products you want to buy from any Polish store (like Allegro, OLX, Ceneo, or any local shop).
                            <br /><br />
                            We will verify the product availability, estimated local shipping costs, and confirm the total price of the items.
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
                            <h3 className='mb-4 md:mb-6'>We Purchase & Confirm</h3>
                        </div>
                        <p>
                            You pay the invoice for the products and our service fee. As soon as we receive the payment, we immediately purchase the items on your behalf.
                        </p>
                        <ul className='list-disc pt-4 pl-10'>
                            <li>We handle all communication with Polish sellers.</li>
                            <li>We solve any payment or language barrier issues.</li>
                            <li>Items are shipped by the seller to our secure warehouse.</li>
                        </ul>
                    </div>
                </div>

                {/* Krok 3: (Treść z Kroku 3 Parcel Forwarding) */}
                <div className='step'>
                    <div className='whiteCard md:w-[46%]'>
                        <div className='flex flex-row items-center'>
                            <div className='stepCircle border-middle-blue'>
                                <span className='stepNumber'>3</span>
                            </div>
                            <h3 className='mb-4 md:mb-6'>Inspection & Consolidation</h3>
                        </div>
                        <p>
                            Once all your items arrive at our facility, we inspect them for damage, verify they match your order, and take clear photos for you.
                            <br /><br />
                            We then securely repackage everything (consolidating multiple orders into one box to save you money) and prepare customs documentation.
                        </p>
                        <div className='my-6 flex flex-wrap gap-x-12 gap-y-8 items-center justify-center'>
                            {/* Rząd 1 */}
                            <img src='/img/carriers/glsPEF.svg' alt='GLS' className='h-4 lg:h-5 carrierIcon' />
                            <img src='/img/carriers/upsPEF.svg' alt='UPS' className='h-6 lg:h-7 carrierIcon' />
                            <img src='/img/carriers/FedExPEF.svg' alt='FedEx' className='h-5 lg:h-7 carrierIcon' />
                            <img src='/img/carriers/dpdPEF.svg' alt='DPD' className='h-5 lg:h-7 carrierIcon' />
                            {/* Rząd 2 */}
                            <img src='/img/carriers/InPostPEF.svg' alt='InPost' className='h-5 lg:h-7 carrierIcon' />
                            <img src='/img/carriers/dhlPEF.svg' alt='DHL' className='h-4 lg:h-7 carrierIcon' />
                            <img
                                src='/img/carriers/pocztaPolskaPEF.svg'
                                alt='Poczta Polska'
                                className='h-4 lg:h-7 max-w-[70px] lg:max-w-[100px] carrierIcon'
                            />
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
                            <h3 className='mb-4 md:mb-6 h3-white'>Final Payment & Shipping</h3>
                        </div>
                        <p className='p-white'>
                            We provide you with the final international shipping options and costs. After you pay the shipping invoice, we dispatch your consolidated package immediately.
                        </p>
                        <img
                            src='/img/TrackingNumber.svg'
                            alt='Tracking code'
                            className='w-[90%] lg:w-[70%] mt-2 lg:mt-0 block mx-auto'
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}