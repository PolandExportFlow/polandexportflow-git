import Link from 'next/link'

function Logo() {
	return (
		<Link href='/' className='text-[20px] md:text-[26px] text-middle-blue font-made_bold flex items-center gap-x-2'>
			<span>
				Poland<span className='text-red'>Export</span>Flow
			</span>
		</Link>
	)
}

export default Logo
