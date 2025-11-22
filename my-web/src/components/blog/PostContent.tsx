import React from 'react'

interface PostContentProps {
	title: string
	date: string
	image: string
	content?: string
}

const PostContent: React.FC<PostContentProps> = ({ title, date, image, content }) => {
	if (!content) return <p>Brak treści posta.</p>
	const processMarkdown = (text: string): JSX.Element[] => {
		const elements: JSX.Element[] = []
		let key = 0

		// Zaktualizowany regex:
		const regex = /(\[\*\*(.*?)\*\*\]\((.*?)\))|(\*\*(.*?)\*\*)|(\[(.*?)\]\((.*?)\))/g

		let lastIndex = 0
		let match

		while ((match = regex.exec(text)) !== null) {
			if (match.index > lastIndex) {
				elements.push(<span key={key++}>{text.substring(lastIndex, match.index)}</span>)
			}

			if (match[1]) {
				elements.push(
					<a
						key={key++}
						href={match[3]}
						target='_blank'
						rel='noopener noreferrer'
						className='text-blue font-heebo_regular underline text-[12px] leading-[22px] md:text-[15px] md:leading-[30px]'>
						<strong>{match[2]}</strong>
					</a>
				)
			} else if (match[4]) {
				elements.push(<strong key={key++}>{match[5]}</strong>)
			} else if (match[6]) {
				elements.push(
					<a
						key={key++}
						href={match[8]}
						target='_blank'
						rel='noopener noreferrer'
						className='text-blue font-heebo_regular underline text-[12px] leading-[22px] md:text-[15px] md:leading-[30px]'>
						{match[7]}
					</a>
				)
			}

			lastIndex = regex.lastIndex
		}

		if (lastIndex < text.length) {
			elements.push(<span key={key++}>{text.substring(lastIndex)}</span>)
		}

		return elements
	}

	const renderContent = (content: string) => {
		const lines = content.split('\n')
		const elements: JSX.Element[] = []
		let currentParagraph = ''
		let listItems: JSX.Element[] = []
		let paragraphIndex = 0

		const flushParagraph = (key: string) => {
			if (currentParagraph) {
				elements.push(
					<p key={key} className='mb-2'>
						{processMarkdown(currentParagraph)}
					</p>
				)
				currentParagraph = ''
			}
		}

		const flushList = (key: string) => {
			if (listItems.length > 0) {
				elements.push(
					<ul key={key} className='list-disc pl-5 mb-6'>
						{listItems}
					</ul>
				)
				listItems = []
			}
		}

		lines.forEach((line, index) => {
			const trimmedLine = line.trim()

			if (!trimmedLine) {
				flushParagraph(`para-${index}`)
				flushList(`ul-${index}`)
				return
			}

			if (trimmedLine === '---') {
				flushParagraph(`para-${index}`)
				flushList(`ul-${index}`)
				elements.push(<span key={`sep-${index}`} className='block py-2 lg:py-4'></span>)
				return
			}
			if (trimmedLine === '--') {
				flushParagraph(`para-${index}`)
				flushList(`ul-${index}`)
				elements.push(<span key={`sep-${index}`} className='block py-1'></span>)
				return
			}
			if (trimmedLine.startsWith('- ')) {
				flushParagraph(`para-${index}`)
				listItems.push(<li key={index}>{processMarkdown(trimmedLine.substring(2))}</li>)
				return
			}

			if (trimmedLine.startsWith('![')) {
				flushParagraph(`para-${index}`)
				flushList(`ul-${index}`)
				const match = trimmedLine.match(/!\[([^\]]*)\]\(([^)]+)\)/)
				if (match) {
					const alt = match[1]
					const src = match[2]
					elements.push(
						<img key={index} src={src} alt={alt} className='my-8 rounded-lg max-h-[400px] w-auto overflow-hidden' />
					)
				}
				return
			}

			if (trimmedLine.startsWith('# ')) {
				flushParagraph(`para-${index}`)
				flushList(`ul-${index}`)
				const text = trimmedLine.substring(2)
				elements.push(<h1 key={index}>{processMarkdown(text)}</h1>)
				return
			} else if (trimmedLine.startsWith('## ')) {
				flushParagraph(`para-${index}`)
				flushList(`ul-${index}`)
				const text = trimmedLine.substring(3)
				elements.push(
					<h2 className='mt-12 lg:mt-18' key={index}>
						{processMarkdown(text)}
					</h2>
				)
				return
			} else if (trimmedLine.startsWith('### ')) {
				flushParagraph(`para-${index}`)
				flushList(`ul-${index}`)
				const text = trimmedLine.substring(4)
				elements.push(
					<h3 className='mt-6 mb-3' key={index}>
						{processMarkdown(text)}
					</h3>
				)
				return
			}

			if (currentParagraph) {
				currentParagraph += ' ' + trimmedLine
			} else {
				currentParagraph = trimmedLine
			}
		})

		flushParagraph(`para-end`)
		flushList(`ul-end`)

		return elements
	}

	return (
		<article className='flex justify-center mt-[80px] py-9 md:py-12 px-3 md:px-8 lg:px-12 w-full bg-white'>
			<div className='wrapper w-full'>
				<h1 className='h1-dark mb-3'>{title}</h1>
				<span className='text-nowrap text-[12px] lg:text-[15px] font-heebo_medium text-middle-blue'>
					Posted: {date}
				</span>
				<div>{renderContent(content)}</div>
			</div>
		</article>
	)
}

export default PostContent
