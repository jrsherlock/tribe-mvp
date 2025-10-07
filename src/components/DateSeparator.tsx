import React from 'react'

interface DateSeparatorProps {
  date: string
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Reset time parts for comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today'
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return 'Yesterday'
    } else {
      // Format as "Monday, October 7th"
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      }
      const formatted = date.toLocaleDateString('en-US', options)
      
      // Add ordinal suffix to day
      const day = date.getDate()
      const suffix = ['th', 'st', 'nd', 'rd'][day % 10 > 3 ? 0 : (day % 100 - day % 10 !== 10) * day % 10]
      
      return formatted.replace(/\d+/, `${day}${suffix}`)
    }
  }

  return (
    <div className="py-3 px-4 flex items-center">
      <div className="flex-1 border-t border-slate-300"></div>
      <span className="px-4 text-sm font-semibold text-slate-500">
        {formatDate(date)}
      </span>
      <div className="flex-1 border-t border-slate-300"></div>
    </div>
  )
}

export default DateSeparator

