import Image from 'next/image'
import HeaderButtons from '../common/HeaderButtons'

const Header = () => {
    return (
        <header className='bg-dark-blue py-[80px] relative w-full lg:h-[680px] overflow-hidden'>
            <Image
                src='/img/europeMapPEF3.svg' 
                alt='Decorative map showing Poland' 
                width={714}
                height={697}
                unoptimized
                priority={true} 
                loading='eager'
                className='europe-map absolute lg:top-[0px] left-1/2 -translate-x-45 -translate-y-3 lg:-translate-x-100 lg:-translate-y-0 opacity-35 object-contain z-0'
            />
            <div className='relative text-center pt-[50px] lg:pt-[100px] px-2'>
                <span className='tracking-wide leading-relaxed p-white mx-auto opacity-70 text-[12px] md:text-[15px]'>
                Small parcels or large shipments — we receive, check, secure, and deliver your items from Poland worldwide.
                </span>
                <h1>
                    Poland Parcel Forwarding <span className='hidden lg:inline'> – Just Like a Friend Send It!</span>
                </h1>
                <HeaderButtons />
            </div>
        </header>
    )
}

export default Header