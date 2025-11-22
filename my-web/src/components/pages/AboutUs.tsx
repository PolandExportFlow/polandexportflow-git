import Image from 'next/image'

export default function AboutUs() {
    return (
        <>
            {/* --- SECTION 1: What we do (Image on left) --- */}
            <section className='section section-top'>
                <div className='flex flex-col lg:flex-row wrapper w-full items-center'>
                    {/* Image 1 (Map) */}
                    <div className='w-full lg:w-1/2 flex justify-center mb-8 lg:mb-0'>
                        <Image
                            src='/img/polandMap.svg'
                            alt='Map of Poland symbolizing export and logistics'
                            width={480}
                            height={480}
                            className='w-[320px] h-[320px] lg:w-[400px] lg:h-[400px] xl:w-[480px] xl:h-[480px]'
                        />
                    </div>

                    {/* Text 1 (Service description) */}
                    <div className='w-full lg:w-1/2 max-w-xl lg:pb-10'>
                        <h2 className='lg:text-left'>About Us</h2>
                        <p className='p-6 bg-ds-light-blue rounded-md'>
                            We are a logistics company specializing in forwarding packages from Polish online stores, as well as from
                            European marketplaces that offer delivery to Poland, to <strong>customers around the world</strong>.
                            <br />
                            <br />
                            Our services cover the <strong>full spectrum of shipping needs</strong>. We handle everything from
                            individual orders sourced on platforms like <strong>Allegro.pl, OLX.pl, or Erli.pl</strong>, to regular
                            shipments for clients buying clothing on <strong>Vinted.pl</strong>.
                            <br />
                            <br />
                            We even manage <strong>pallet-sized deliveries</strong> containing personal belongings, office equipment,
                            building materials, or wholesale goods.
                        </p>
                    </div>
                </div>
            </section>

            {/* --- SECTION 2: Our story (Image on right) --- */}
            <section className='section bg-red'>
                <div className='flex flex-col lg:flex-row-reverse wrapper w-full items-center py-12'>
                    {/* Image 2 (Eiffel Tower) */}
                    <div className='w-full lg:w-1/2 flex justify-center mb-8 lg:mb-0'>
                        <Image
                            src='/img/zlepef2.jpg'
                            alt="Client's package in front of the Eiffel Tower in Paris"
                            width={480}
                            height={480}
                            className='w-[320px] h-[320px] lg:w-[400px] lg:h-[400px] xl:w-[480px] xl:h-[480px] rounded-lg object-cover shadow-md'
                        />
                    </div>

                    {/* Text 2 (Story) */}
                    <div className='w-full lg:w-1/2 max-w-xl lg:pb-10 text-white tracking-wide'>
                        <h3 className='h3-light-blue mb-6'>Our Story</h3>
                        <p className='p-white p-6 bg-light-red/30 rounded-md'>
                            Our journey began in early 2025, when we successfully dispatched our very first shipment: a{' '}
                            <strong>special metal-case edition of Call of Duty: World at War for the PS3</strong>
                            .
                            <br />
                            <br />
                            Since that moment, we have handled hundreds of inquiries regarding the export of various items, confirming
                            the growing global demand for reliable forwarding solutions from the Polish market.
                        </p>
                    </div>
                </div>
            </section>

            {/* --- SECTION 3: Our Mission (Image on left) --- */}
            {/* NOWA SEKCJA: Struktura skopiowana z Sekcji 1 dla "zig-zag" */}
            <section className='section'>
                <div className='flex flex-col lg:flex-row wrapper w-full items-center py-12'>
                    {/* Image 3 (Reuse Map, or change src to a new image) */}
                    <div className='w-full lg:w-1/2 flex justify-center mb-8 lg:mb-0'>
                        <Image
                            // Możesz tu podmienić obraz na inny, np. /img/warehouse.svg
                            src='/img/polandMap.svg'
                            alt='Logistics and forwarding mission'
                            width={480}
                            height={480}
                            className='w-[320px] h-[320px] lg:w-[400px] lg:h-[400px] xl:w-[480px] xl:h-[480px]'
                        />
                    </div>

                    {/* Text 3 (Mission & CTA) */}
                    <div className='w-full lg:w-1/2 max-w-xl lg:pb-10'>
                        <h3 className='lg:text-left mb-6'>Our Mission</h3>
                        <p className='p-6 bg-ds-light-blue rounded-md'>
                            Today, we continue to expand and refine our services with one goal in mind: to provide a{' '}
                            <strong>seamless and accessible way</strong> for customers from{' '}
                            <strong>America, Asia, Africa, Australia, and all of Europe</strong> to shop on Polish marketplaces as
                            easily as they would within their own domestic markets.
                            <br />
                            <br />
                            Our mission is to create a <strong>trusted space</strong> where international shopping becomes{' '}
                            <strong>straightforward, transparent, and worry-free</strong>.
                        </p>

                        {/* CTA przeniesione tutaj */}
                        <p className='mt-8 p-6 bg-ds-light-blue rounded-md'>
                            <strong>Interested in our services?</strong> Simply create an account and choose the option that best
                            suits your needs. Should you have any questions regarding exports from Poland, feel free to contact us by
                            completing the form available in the Contact section. We are here to help.
                        </p>
                    </div>
                </div>
            </section>
        </>
    )
}