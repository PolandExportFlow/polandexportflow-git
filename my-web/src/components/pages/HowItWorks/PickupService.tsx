'use client'

import StepNumber from '@/components/common/StepNumber';
import React, { useEffect, useState, useRef } from 'react'

export default function PickupService() { // ZMIANA NAZWY FUNKCJI
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
                <h2>How it works? - Pickup Service</h2>
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
                            <h3 className='mb-4 md:mb-6'>Schedule Your Pickup</h3>
                        </div>
                        <p>
                            Tell us where and when. Provide the seller's address (e.g., from Allegro, OLX, or a local manufacturer), contact information, and the size of the shipment.
                            <br /><br />
                            We coordinate the logistics, whether it's a small box or a large pallet.
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
                            <h3 className='mb-4 md:mb-6'>We Collect & Transport</h3>
                        </div>
                        <p>
                            Our driver or a trusted local courier partner (like DPD, DHL, or InPost) collects the goods directly from the seller's location on your behalf.
                        </p>
                        <ul className='list-disc pt-4 pl-10'>
                            <li>Full tracking from the moment of pickup.</li>
                            <li>Handling of both standard parcels and oversized freight.</li>
                            <li>No need for the seller to handle shipping labels or logistics.</li>
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
                            <h3 className='mb-4 md:mb-6'>Warehouse Processing & Inspection</h3>
                        </div>
                        <p>
                            The items arrive at our secure warehouse. We immediately verify the contents against your order, inspect for any damage, take photos, and update your account.
                            <br /><br />
                            Your items are now safely stored in your "virtual warehouse," ready for the next step.
                        </p>
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
                            <h3 className='mb-4 md:mb-6 h3-white'>Consolidation & Forwarding</h3>
                        </div>
                        <p className='p-white'>
                            You can now combine this pickup with other orders (Assisted Purchase or Parcel Forwarding) into one single international shipment to save costs.
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