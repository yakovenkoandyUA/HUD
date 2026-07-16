import React, { useState } from 'react'
import styles from './WatchlistCard.module.css'
import type { WatchlistItem } from '@/shared/types'

/**
 * WatchlistCard
 * -------------
 * Poster card in the 2-column watchlist grid.
 *
 * Props:
 * @prop {WatchlistItem}  item    — item to display
 * @prop {() => void}     onClick — open detail modal
 */
interface WatchlistCardProps {
	item: WatchlistItem
	onClick: () => void
}

const CATEGORY_ICON: Record<string, string> = {
	movie: '🎬',
	series: '📺',
	anime: '🎌',
}

const STATUS_LABEL: Record<string, string> = {
	want: 'ХОЧУ',
	watching: 'ДИВЛЮСЬ',
	watched: 'ГЛЯНУВ',
	dropped: 'КИНУВ',
}

const STATUS_CLASS: Record<string, string> = {
	want: styles.statusWant,
	watching: styles.statusWatching,
	watched: styles.statusWatched,
	dropped: styles.statusDropped,
}

const getStatusLabel = (item: WatchlistItem) => STATUS_LABEL[item.status] ?? null

const WatchlistCard: React.FC<WatchlistCardProps> = ({ item, onClick }) => {
	const [imgError, setImgError] = useState(false)
	const imgSrc = item.posterPath
		? `https://image.tmdb.org/t/p/w342${item.posterPath}`
		: (item.thumbnail || null)
	const showImg = imgSrc && !imgError

	return (
		<button type="button" className={styles.card} onClick={onClick}>
			<div className={styles.poster}>
				{showImg ? (
					<img
						src={imgSrc}
						alt={item.title}
						className={styles.img}
						loading="lazy"
						onError={() => setImgError(true)}
					/>
				) : (
					<div className={styles.noImg}>
						<span>{CATEGORY_ICON[item.category]}</span>
					</div>
				)}

				{getStatusLabel(item) && <span className={`${styles.statusBadge} ${STATUS_CLASS[item.status] ?? ''}`}>{getStatusLabel(item)}</span>}

				{item.watchTogether && (
					<div className={styles.togetherBadge}>
						<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
							<path d="M5 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.5"/>
							<path d="M11 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.5"/>
							<path d="M1 14s0-3 4-3M15 14s0-3-4-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
						</svg>
					</div>
				)}

				{item.status === 'watching' && <div className={styles.watchingBar} />}
			</div>

			<div className={styles.info}>
				<p className={styles.title}>{item.title}</p>
				<div className={styles.meta}>
					{item.year && <span className={styles.year}>{item.year}</span>}
					{item.status === 'watched' && item.rating != null && item.rating > 0 && <span className={styles.ratingTag}>★ {item.rating}</span>}
				</div>
			</div>
		</button>
	)
}

export default WatchlistCard
