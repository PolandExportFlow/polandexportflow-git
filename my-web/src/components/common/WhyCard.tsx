import React from 'react'

interface WhyCardProps {
    icon?: React.ReactNode
    title: string
    description: React.ReactNode
    color: string
    titleClass?: string
    cardClass?: string
}

// Usunięto React.FC, zachowano oryginalne twarde wymiary h-[290px] / lg:h-[380px]
const WhyCard = ({ icon, title, description, color, titleClass = 'my-10', cardClass = '' }: WhyCardProps) => {
    return (
        <div className={`w-full h-[290px] lg:w-[320px] lg:h-[380px] ${color} flex flex-col ${cardClass}`}>
            <div className='mb-2 '>{icon}</div>
            <h3 className={titleClass}>{title}</h3>
            <div className='flex-grow'>
                <p>{description}</p>
            </div>
        </div>
    )
}

export default WhyCard