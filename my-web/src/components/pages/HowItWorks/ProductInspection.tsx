'use client'

import StepNumber from '@/components/common/StepNumber';
import React, { useEffect, useState, useRef } from 'react'

export default function ProductInspection() { // ZMIANA NAZWY FUNKCJI
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
                <h2>How it works? - Product Inspection</h2>
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
                            <h3 className='mb-4 md:mb-6'>Define Inspection Scope</h3>
                        </div>
                        <p>
                            You tell us exactly what you need checked. Don't rely only on seller photos.
                            <br /><br />
                            We can verify product models, quantities, colors, check for physical damage, measure dimensions, or even perform basic functional tests (e.g., "does it turn on?").
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
                            <h3 className='mb-4 md:mb-6'>Item Arrival at Warehouse</h3>
                        </div>
                        <p>
                            Your products arrive at our warehouse. This can be via an Assisted Purchase we made for you, a Pickup Service we arranged, or a package you sent as part of Parcel Forwarding.
                        </p>
                        <ul className='list-disc pt-4 pl-10'>
                            <li>We log every item and prepare it for the inspection you defined.</li>
                            <li>Ideal for B2B sampling or verifying marketplace (Allegro/OLX) item conditions.</li>
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
                            <h3 className='mb-4 md:mb-6'>Detailed Report & Photos</h3>
                        </div>
                        <p>
                            Our team conducts the inspection based on your checklist. We provide high-resolution photos, videos, and a detailed report outlining our findings.
                            <br /><br />
                            You see exactly what we see, giving you the confidence to make an informed decision before spending money on international shipping.
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
                            <h3 className='mb-4 md:mb-6 h3-white'>Your Decision & Forwarding</h3>
                        </div>
                        <p className='p-white'>
                            Based on our inspection report, you give the command:
                        </p>
                        <ul className='list-disc pt-4 pl-6 p-white space-y-2'>
                            <li>**Approve:** We pack and forward the items.</li>
                            <li>**Reject:** We arrange a return to the Polish seller.</li>
                            <li>**Dispose:** We handle disposal of unwanted goods.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    )
}