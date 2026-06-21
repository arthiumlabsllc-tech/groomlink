import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HaircutIcon, BarberIcon, NailsIcon, BraidingIcon, MassageIcon, DreadlocksIcon, MakeupIcon, SkinCareIcon } from './CategoryIcons'

const categories = [
  { name: 'Styling', Icon: HaircutIcon },
  { name: 'Cuts & Fades', Icon: BarberIcon },
  { name: 'Nails', Icon: NailsIcon },
  { name: 'Braiding', Icon: BraidingIcon },
  { name: 'Massage', Icon: MassageIcon },
  { name: 'Dreadlocks', Icon: DreadlocksIcon },
  { name: 'Makeup', Icon: MakeupIcon },
  { name: 'Skin Care', Icon: SkinCareIcon },
]

export default function PopularCategories() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-20 bg-brand-surface">
      <div className="section-container">
        {/* Section Header */}
        <div className={`text-center mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-brand-text mb-4">
            Popular Categories
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Browse services by category and find exactly what you need
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category, index) => (
            <Link
              key={category.name}
              to={`/explore?category=${encodeURIComponent(category.name)}`}
              className={`group card card-hover p-6 flex flex-col items-center text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${index * 75}ms` }}
            >
              {/* Icon */}
              <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-brand-primary group-hover:text-white transition-colors">
                <category.Icon className="w-7 h-7" />
              </div>
              
              {/* Name */}
              <h3 className="font-semibold text-brand-text group-hover:text-brand-primary transition-colors">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
