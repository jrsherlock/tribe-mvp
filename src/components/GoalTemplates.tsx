import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronDown, Sparkles } from 'lucide-react'
import { GOAL_TEMPLATES, getCategories, type GoalTemplate } from '../lib/goalTemplates'

/**
 * Props for GoalTemplates component
 */
export interface GoalTemplatesProps {
  onGoalAdded?: () => void
  onTemplateSelected?: (template: GoalTemplate) => void
  className?: string
}

/**
 * GoalTemplates Component
 * Displays pre-configured goal templates that users can quickly add
 */
export const GoalTemplates: React.FC<GoalTemplatesProps> = ({
  onGoalAdded,
  onTemplateSelected,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<GoalTemplate['category'] | 'all'>('all')

  const categories = getCategories()

  // Filter templates by selected category
  const filteredTemplates = selectedCategory === 'all'
    ? GOAL_TEMPLATES
    : GOAL_TEMPLATES.filter(t => t.category === selectedCategory)

  // Handle template selection - open modal instead of directly adding
  const handleSelectTemplate = (template: GoalTemplate) => {
    onTemplateSelected?.(template)
  }

  return (
    <div className={`bg-gradient-to-br from-accent/5 to-primary-50 rounded-3xl border border-accent/20 overflow-hidden ${className}`}>
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-accent/10 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent/80 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-900" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-primary-800">Goal Templates</h3>
            <p className="text-sm text-primary-600">Quick-add common recovery goals</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-primary-600" />
        </motion.div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4">
              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-accent-500 text-white shadow-lg'
                      : 'bg-white text-primary-600 hover:bg-primary-100'
                  }`}
                >
                  All Templates
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedCategory === category.id
                        ? 'bg-accent-500 text-white shadow-lg'
                        : 'bg-white text-primary-600 hover:bg-primary-100'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              {/* Category Description */}
              {selectedCategory !== 'all' && (
                <p className="text-sm text-primary-600 italic">
                  {categories.find(c => c.id === selectedCategory)?.description}
                </p>
              )}

              {/* Templates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                {filteredTemplates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl p-4 border border-primary-200 hover:border-accent-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 ${template.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <template.icon className="w-5 h-5 text-white" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-primary-800 text-sm group-hover:text-accent-700 transition-colors mb-1">
                          {template.title}
                        </h4>
                        <p className="text-xs text-primary-600 line-clamp-2 mb-3">
                          {template.description}
                        </p>

                        {/* Add Button */}
                        <button
                          onClick={() => handleSelectTemplate(template)}
                          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-accent/10 hover:bg-accent text-primary-800 hover:text-primary-900 rounded-lg text-sm font-medium transition-all group-hover:bg-accent group-hover:text-primary-900"
                        >
                          <Plus size={16} />
                          <span>Add Goal</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Empty State */}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-primary-600">
                  <p>No templates in this category yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GoalTemplates

