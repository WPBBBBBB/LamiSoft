#!/usr/bin/env node


const iconMapping = {
  success: [
    'Plus', 'Save', 'Check', 'CheckCircle', 'CheckSquare',
    'ThumbsUp', 'TrendingUp', 'ArrowUp', 'Upload'
  ],
  
  danger: [
    'Trash2', 'X', 'XCircle', 'Minus', 'AlertTriangle',
    'ShoppingCart', 'ArrowDown', 'TrendingDown'
  ],
  
  info: [
    'Edit', 'Eye', 'Info', 'Search', 'Filter', 'Download',
    'RefreshCw', 'Settings', 'FileText', 'Warehouse',
    'Database', 'Archive', 'Printer'
  ],
  
  warning: [
    'AlertCircle', 'Bell', 'Clock', 'Calendar',
    'PackageOpen', 'Wallet'
  ],
  
  general: [
    'User', 'Users', 'Phone', 'Mail', 'MapPin',
    'Home', 'Menu', 'MoreVertical', 'ChevronDown',
    'ChevronRight', 'ChevronUp', 'ChevronLeft',
    'ArrowRight', 'ArrowLeft'
  ]
}

function getVariantForIcon(iconName) {
  for (const [variant, icons] of Object.entries(iconMapping)) {
    if (icons.includes(iconName)) {
      return variant === 'general' ? 'theme-icon' : `theme-${variant}`
    }
  }
  return 'theme-icon'
}


Object.entries(iconMapping).forEach(([variant, icons]) => {
  const className = variant === 'general' ? 'theme-icon' : `theme-${variant}`
  console.log(`\n${className}:`)
  console.log(`  ${icons.join(', ')}`)
})

module.exports = { iconMapping, getVariantForIcon }
