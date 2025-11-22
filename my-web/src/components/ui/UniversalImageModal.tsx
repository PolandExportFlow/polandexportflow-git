'use client'

import React, { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { RotateCw } from 'lucide-react'

interface UniversalImageModalProps {
	selectedPhoto: string | null
	onClose: () => void
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

export default function UniversalImageModal({ selectedPhoto, onClose }: UniversalImageModalProps) {
	const [zoom, setZoom] = useState(1)
	const [rotation, setRotation] = useState(0)
	const [isDragging, setIsDragging] = useState(false)
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
	const [position, setPosition] = useState({ x: 0, y: 0 })
	const [lastTouchDistance, setLastTouchDistance] = useState(0)

	useEffect(() => {
		if (selectedPhoto) {
			setZoom(1)
			setRotation(0)
			setPosition({ x: 0, y: 0 })
			setIsDragging(false)
			setLastTouchDistance(0)
		}
	}, [selectedPhoto])

	useEffect(() => {
		if (!selectedPhoto) return
		const onKey = (e: KeyboardEvent) => {
			switch (e.key) {
				case '+':
				case '=':
					e.preventDefault()
					setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM))
					break
				case '-':
				case '_':
					e.preventDefault()
					setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM))
					break
				case 'r':
				case 'R':
					e.preventDefault()
					setRotation(r => (r + 90) % 360)
					break
				case 'Escape':
					onClose()
					break
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [selectedPhoto, onClose])

	if (!selectedPhoto) return null

	const onWheel: React.WheelEventHandler<HTMLDivElement> = e => {
		e.preventDefault()
		const delta = e.deltaY > 0 ? -0.1 : 0.1
		setZoom(z => Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM))
	}

	const onMouseDown: React.MouseEventHandler<HTMLDivElement> = e => {
		if (zoom <= 1) return
		setIsDragging(true)
		setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
	}
	const onMouseMove: React.MouseEventHandler<HTMLDivElement> = e => {
		if (!isDragging || zoom <= 1) return
		setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
	}
	const stopDrag = () => setIsDragging(false)

	const dist = (e: React.TouchEvent) => {
		if (e.touches.length < 2) return 0
		const [a, b] = [e.touches[0], e.touches[1]]
		return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
	}
	const onTouchStart = (e: React.TouchEvent) => {
		if (e.touches.length === 2) {
			setLastTouchDistance(dist(e))
		} else if (e.touches.length === 1 && zoom > 1) {
			const t = e.touches[0]
			setIsDragging(true)
			setDragStart({ x: t.clientX - position.x, y: t.clientY - position.y })
		}
	}
	const onTouchMove = (e: React.TouchEvent) => {
		e.preventDefault()
		if (e.touches.length === 2) {
			const cur = dist(e)
			if (lastTouchDistance > 0) {
				const scale = cur / lastTouchDistance
				setZoom(z => Math.min(Math.max(z * scale, MIN_ZOOM), MAX_ZOOM))
			}
			setLastTouchDistance(cur)
		} else if (e.touches.length === 1 && isDragging) {
			const t = e.touches[0]
			setPosition({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y })
		}
	}
	const onTouchEnd = () => {
		setIsDragging(false)
		setLastTouchDistance(0)
	}
	let filename = 'Podgląd obrazu'
	try {
		const url = new URL(selectedPhoto)
		const path = url.pathname.split('/').pop()
		filename = decodeURIComponent(path || filename)
	} catch {}

	const titleElement = (
		<span className='font-heebo_medium text-[12px] sm:text-[14px] text-middle-blue/70 px-4 md:px-6 '>{filename}</span>
	)

	const rotateButton = (
		<button
			onClick={() => setRotation(r => (r + 90) % 360)}
			title='Obróć (R)'
			className='p-2 sm:p-3 rounded-lg hover:bg-middle-blue/10 text-middle-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-middle-blue/30'>
			<RotateCw className='w-4 h-4 sm:w-5 sm:h-5' />
		</button>
	)

	return (
		<Modal isOpen={true} onClose={onClose} size='sm' title={titleElement} actions={rotateButton}>
			<div
				className='
                    relative w-full
                    max-w-[900px]
                    mx-auto
                    overflow-hidden
                    sm:rounded-md
                    px-3 md:px-6 pt-3 pb-6
                    touch-pan-y
                '
				onWheel={onWheel}
				onMouseDown={onMouseDown}
				onMouseMove={onMouseMove}
				onMouseUp={stopDrag}
				onMouseLeave={stopDrag}
				onTouchStart={onTouchStart}
				onTouchMove={onTouchMove}
				onTouchEnd={onTouchEnd}>
				<div className='flex w-full items-start md:items-center justify-center select-none'>
					<div
						style={{
							transformOrigin: 'center center',
							transform: `translate(${position.x / zoom}px, ${
								position.y / zoom
							}px) scale(${zoom}) rotate(${rotation}deg)`,
							transition: isDragging ? 'none' : 'transform 0.18s ease-out',
							cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
						}}>
						<img
							src={selectedPhoto}
							alt='Preview'
							className='block max-h-[64vh] md:max-h-[74vh] max-w-[92vw] md:max-w-[82vw] object-contain pointer-events-none'
							draggable={false}
						/>
					</div>
				</div>
			</div>
		</Modal>
	)
}
