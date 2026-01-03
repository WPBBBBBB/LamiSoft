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

console.log('أمثلة على تحديث الأيقونات:')
console.log('')
console.log('
console.log('<Plus className="h-4 w-4" />')
console.log('<Trash2 className="h-4 w-4 text-red-600" />')
console.log('<Search className="h-4 w-4 text-muted-foreground" />')
console.log('')
console.log('
console.log('<Plus className="h-4 w-4 theme-success" />')
console.log('<Trash2 className="h-4 w-4 theme-danger" />')
console.log('<Search className="h-4 w-4 theme-info" />')
console.log('')
console.log('
console.log('<h1 style={{ color: "var(--theme-primary)" }}>العنوان</h1>')
console.log('')
console.log('تصنيف الأيقونات:')
Object.entries(iconMapping).forEach(([variant, icons]) => {
  const className = variant === 'general' ? 'theme-icon' : `theme-${variant}`
  console.log(`\n${className}:`)
  console.log(`  ${icons.join(', ')}`)
})

module.exports = { iconMapping, getVariantForIcon }
