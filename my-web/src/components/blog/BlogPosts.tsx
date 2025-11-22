'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Post } from '@/utils/getPosts'

interface BlogPostsProps {
	posts: Post[]
}

const BlogPosts: React.FC<BlogPostsProps> = ({ posts }) => {
	const [selectedTag, setSelectedTag] = useState<string | null>(null)

	const tags = ['Carriers', 'E-commerce', 'Marketplace', 'Breaking News']

	const filteredPosts = selectedTag ? posts.filter(post => post.tags.includes(selectedTag)) : posts

	return (
		<section className='section mt-[80px] lg:mt-[130px] bg-light-blue min-h-screen'>
			<div className='wrapper w-full'>
				<div className='flex flex-col md:flex-row md:justify-between items-start'>
					<h2>Blog</h2>
					<div className='flex flex-wrap md:flex-nowrap gap-2 font-heebo_medium text-[13px] pb-4'>
						{tags.map(tag => (
							<button
								key={tag}
								onClick={() => setSelectedTag(tag)}
								className={`px-5 py-2 rounded-sm text-nowrap transition duration-200 ${
									selectedTag === tag ? 'bg-dark-blue text-white' : 'bg-white text-dark-blue hover:bg-dark-blue/30'
								}`}>
								{tag}
							</button>
						))}
						<button
							onClick={() => setSelectedTag(null)}
							className={`px-5 py-2 rounded-sm text-nowrap transition duration-200 ${
								selectedTag === null ? 'bg-dark-blue text-white' : 'bg-white text-dark-blue hover:bg-dark-blue/30'
							}`}>
							All Posts
						</button>
					</div>
				</div>

				<div className='grid gap-4 md:gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
					{filteredPosts.map((post: Post) => (
						<Link
							key={post.slug}
							href={`/blog/${post.slug}`}
							className='bg-white flex flex-col h-full group rounded-sm overflow-hidden hover:bg-dark-blue/40 transition duration-300 mb-4'>
							<img
								src={post.image}
								alt={post.title}
								className='w-full h-[280px] object-cover object-center  transition-opacity duration-300 group-hover:opacity-75'
							/>
							<div className='px-6 md:px-8'>
								<div className='flex flex-wrap w-full pt-6'>
									<div className='flex-1 flex flex-wrap'>
										{post.tags.map(tag => (
											<span
												key={tag}
												className='bg-light-blue text-dark-blue transition-colors duration-300 group-hover:bg-dark-blue/40 px-2 py-1 rounded-sm text-xs mr-2 mb-2'>
												{tag}
											</span>
										))}
									</div>
									<span className='font-heebo_regular text-center text-[12px] text-nowrap text-middle-blue transition-colors duration-300 group-hover:text-dark-blue'>
										{post.date}
									</span>
								</div>
								<hr className='my-2 -mx-6 md:-mx-8 border-t border-blue opacity-12' />
								<div className='pt-3 pb-6 md:pb-8'>
									<h3>{post.title}</h3>
									<p className='mt-4'>{post.excerpt}</p>
								</div>
							</div>
						</Link>
					))}
				</div>
			</div>
		</section>
	)
}

export default BlogPosts
