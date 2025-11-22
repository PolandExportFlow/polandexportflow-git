'use client'

import StepNumber from '@/components/common/StepNumber';
import React, { useEffect, useState, useRef } from 'react'

export default function ParcelForwarding() { // ZMIANA NAZWY FUNKCJI
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
                <h2>Parcel Forwarding</h2>
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

                {/* Krok 1 */}
                <div className='step'>
                    <div className='whiteCard md:w-[46%]'>
                        <div className='flex flex-row items-center'>
                            <div className='stepCircle border-middle-blue'>
                                <span className='stepNumber'>1</span>
                            </div>
                            <h3 className='mb-4 md:mb-6'>Submit a Request</h3>
                        </div>

                        <p>
                            Send us details about the products you want to purchase or ship. You can order from any Polish store,
                            marketplace, or supplier.
                            <br />
                            <br />
                            Once you choose a product, we’ll handle the sourcing and logistics. If you can’t find what you need, let
                            us know—we’ll search for it and provide details.
                        </p>
                    </div>
                    <StepNumber number={1} />
                </div>

                {/* Krok 2 */}
                <div className='step'>
                    <StepNumber number={2} />
                    <div className='relative w-full whiteCard md:w-[46%]'>
                        <div className='flex flex-row items-center'>
                            <div className='stepCircle border-middle-blue'>
                                <span className='stepNumber'>2</span>
                            </div>
                            <h3 className='mb-4 md:mb-6'>Order Process & Payment</h3>
                        </div>
                        <p>First, we will send you a brief with the following questions:</p>
                        <ul className='list-disc pt-4 pl-10'>
                            <li>What is the exact delivery address, including the postal code?</li>
                            <li>Which shipping method do you choose?</li>
                            <li>Which payment method do you prefer?</li>
                            <li>Additional questions may apply depending on the product you are ordering.</li>
                        </ul>
                        <div className='my-4 md:m-6 flex flex-row flex-wrap justify-between items-center gap-2'>
                            <img
                                className='h-[40px] w-auto border md:border-[2px] border-light-blue p-2.5 rounded-md'
                                src='/img/paymentMethods/Revolut.svg'
                                alt='Revolut'
                            />
                            <img
                                className='h-[40px] w-auto border md:border-[2px] border-light-blue p-2.5 rounded-md'
                                src='/img/paymentMethods/PayPal.svg'
                                alt='PayPal'
                            />
                            <img className='h-10 w-auto' src='/img/paymentMethods/Visa.svg' alt='Visa' />
                            <img className='h-10 w-auto' src='/img/paymentMethods/GooglePay.svg' alt='Google Pay' />
                            <img className='h-10 w-auto' src='/img/paymentMethods/ApplePay.svg' alt='Apple Pay' />
                            <img className='h-10 w-auto' src='/img/paymentMethods/Mastercard.svg' alt='Mastercard' />
                        </div>

                        <p>
                            As soon as we receive the payment, we purchase the product and arrange for it to be shipped to our
                            facility.
                        </p>
                    </div>
                </div>

                {/* Krok 3 */}
                <div className='step'>
                    <div className='whiteCard md:w-[46%]'>
                        <div className='flex flex-row items-center'>
                            <div className='stepCircle border-middle-blue'>
                                <span className='stepNumber'>3</span>
                            </div>
                            <h3 className='mb-4 md:mb-6'>Shipment Preparation</h3>
                        </div>
                        <p>
                            Once your product reaches our facility, we inspect it and take clear photos for you. We then securely
                            repackage it for safe delivery. Our goal is to protect your order and meet your expectations.
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

                {/* Krok 4 */}
                <div className='step'>
                    <StepNumber number={4} />
                    <div className='relative bg-red text-white p-6 md:p-8 md:w-[46%]'>
                        <div className='flex flex-row items-center'>
                            <div className='stepCircle border-white '>
                                <span className='font-made_bold text-white text-[14px]'>4</span>
                            </div>
                            <h3 className='mb-4 md:mb-6 h3-white'>Final Shipment & Tracking</h3>
                        </div>
                        <p className='p-white'>
                            After your final approval, we dispatch your package via your chosen carrier. You’ll receive full tracking
                            details to monitor your delivery in real time.
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