import React from 'react'
import TimelineBody from '../../components/timeline/TimelineBody'

/**
 * TimelineTab
 * -----------
 * Таб "Хроніка" на сторінці профілю — Family Timeline без власного AppHeader,
 * бо ProfilePage вже має свій заголовок.
 */
const TimelineTab: React.FC = () => {
  return <TimelineBody />
}

export default TimelineTab
