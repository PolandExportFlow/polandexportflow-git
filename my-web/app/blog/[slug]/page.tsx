import React from 'react'
import { getAllPosts, getPostBySlug } from '@/utils/getPosts'
import PostContent from '@/components/blog/PostContent'
import { Metadata } from 'next'
import Script from 'next/script'

type Post = {
	title: string
	excerpt?: string
	keywords: string[]
	image: string
	tags: string[]
	date: string
	content: string
}

type PageProps = {
	params: any
}

export async function generateStaticParams() {
	const posts = await getAllPosts()
	return posts.map(post => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params
	const post = await getPostBySlug(slug)

	if (!post) {
		return {
			title: 'Page Not Found - PolandExportFlow',
			description: 'The page you are looking for might have been moved or deleted.',
			openGraph: {
				title: 'Page Not Found - PolandExportFlow',
				description: 'The page you are looking for might have been moved or deleted.',
			},
		}
	}

	const title = `${post.title}`.slice(0, 60)
	const description = (post.excerpt || 'No description available').slice(0, 160) // Description limit

	return {
		title: title,
		description: description,
		keywords: post.keywords.join(', '),
		openGraph: {
			title: post.title,
			description: post.excerpt || 'No description available',
			url: `https://polandexportflow.com/blog/${slug}`,
			images: [
				{
					url: post.image,
					width: 1200,
					height: 630,
					alt: post.title,
				},
			],
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: post.title,
			description: post.excerpt || 'No description available',
			images: [post.image],
		},
		alternates: {
			canonical: `https://polandexportflow.com/blog/${slug}`,
		},
	}
}

export default async function Page({ params }: PageProps) {
	const { slug } = await params

	const post = await getPostBySlug(slug)

	if (!post) {
		return (
			<div>
				<h1>Post Not Found</h1>
				<p>The post you are looking for could not be found.</p>
			</div>
		)
	}

	return (
		<div>
			<PostContent title={post.title} date={post.date} image={post.image} content={post.content} />

			{/* Structured Data Schema.org */}
			<Script
				id='article-structured-data'
				type='application/ld+json'
				strategy='afterInteractive'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'Article',
						headline: post.title,
						description: post.excerpt || 'No description available',
						image: post.image,
						datePublished: post.date,
						author: {
							'@type': 'Person',
							name: 'PolandExportFlow',
						},
						publisher: {
							'@type': 'Organization',
							name: 'PolandExportFlow',
							logo: {
								'@type': 'ImageObject',
								url: 'https://polandexportflow.com/logo.png',
							},
						},
					}),
				}}
			/>
		</div>
	)
}
