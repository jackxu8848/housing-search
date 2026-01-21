import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [properties, setProperties] = useState([])
  const [filteredProperties, setFilteredProperties] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Filter states
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [selectedPropertyType, setSelectedPropertyType] = useState('')
  const [selectedTag, setSelectedTag] = useState('')

  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    setProperties([])
    setFilteredProperties([])

    try {
      // Use environment variable if set, otherwise use relative path for same-origin
      const apiUrl = import.meta.env.VITE_API_URL || '/api'
      const response = await fetch(`${apiUrl}/properties?type=bargain`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch properties')
      }

      const data = await response.json()
      setProperties(data.properties || [])
      setFilteredProperties(data.properties || [])
    } catch (err) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Apply filters
  const applyFilters = () => {
    let filtered = [...properties]

    // Price range filter
    if (minPrice) {
      const min = parseInt(minPrice)
      filtered = filtered.filter(p => !p.askingPrice || p.askingPrice >= min)
    }
    if (maxPrice) {
      const max = parseInt(maxPrice)
      filtered = filtered.filter(p => !p.askingPrice || p.askingPrice <= max)
    }

    // Property type filter
    if (selectedPropertyType) {
      filtered = filtered.filter(p => 
        p.propertyType?.toLowerCase().includes(selectedPropertyType.toLowerCase())
      )
    }

    // Label/tag filter
    if (selectedTag) {
      filtered = filtered.filter(p => 
        p.tags?.some(tag => tag.toLowerCase().includes(selectedTag.toLowerCase()))
      )
    }

    setFilteredProperties(filtered)
  }

  // Get unique property types and tags for filter dropdowns
  const uniquePropertyTypes = [...new Set(properties.map(p => p.propertyType).filter(Boolean))]
  const allTags = properties.flatMap(p => p.tags || [])
  const uniqueTags = [...new Set(allTags)]

  // Auto-apply filters when they change
  useEffect(() => {
    if (properties.length > 0) {
      applyFilters()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice, selectedPropertyType, selectedTag, properties])

  return (
    <div className="app">
      <main className="app-main">
        {properties.length === 0 && !loading && (
          <div className="search-container">
            <div className="hero-section">
              <h2 className="hero-title">发现优质房产机会</h2>
              <p className="hero-subtitle">智能筛选，精准定位您的理想房源</p>
              <button 
                className="search-button" 
                onClick={handleSearch}
                disabled={loading}
              >
                捡漏机会
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>正在搜索符合条件的房产...</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <p className="error-message">{error}</p>
          </div>
        )}

        {properties.length > 0 && (
          <div className="properties-container">
            <div className="properties-header">
              <h2>找到 {filteredProperties.length} 个符合条件的房产</h2>
              <button className="search-again-button" onClick={() => {
                setProperties([])
                setFilteredProperties([])
                setMinPrice('')
                setMaxPrice('')
                setSelectedPropertyType('')
                setSelectedTag('')
              }}>
                返回主页
              </button>
            </div>
            
            <div className="filters-container">
              <div className="filter-group">
                <label htmlFor="minPrice">最低价格:</label>
                <input
                  id="minPrice"
                  type="number"
                  placeholder="最小值"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="filter-input"
                />
              </div>
              
              <div className="filter-group">
                <label htmlFor="maxPrice">最高价格:</label>
                <input
                  id="maxPrice"
                  type="number"
                  placeholder="最大值"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="filter-input"
                />
              </div>
              
              <div className="filter-group">
                <label htmlFor="propertyType">房产类型:</label>
                <select
                  id="propertyType"
                  value={selectedPropertyType}
                  onChange={(e) => setSelectedPropertyType(e.target.value)}
                  className="filter-select"
                >
                  <option value="">全部</option>
                  {uniquePropertyTypes.map((type, index) => (
                    <option key={index} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label htmlFor="tag">标签:</label>
                <select
                  id="tag"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="filter-select"
                >
                  <option value="">全部</option>
                  {uniqueTags.map((tag, index) => (
                    <option key={index} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="properties-list">
              {filteredProperties.map((property, index) => (
                <PropertyCard key={property.mlsNumber || index} property={property} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function PropertyCard({ property }) {
  const formatPrice = (price) => {
    if (!price) return '价格未公开'
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0
    }).format(price)
  }

  const handleCardClick = () => {
    if (property.realtorCaLink) {
      window.open(property.realtorCaLink, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="property-card" onClick={handleCardClick} style={{ cursor: property.realtorCaLink ? 'pointer' : 'default' }}>
      {property.thumbnail && (
        <div className="property-image">
          <img src={property.thumbnail} alt={property.address} />
        </div>
      )}
      <div className="property-details">
        <div className="property-mls">
          <strong>MLS #:</strong> {property.mlsNumber || 'N/A'}
        </div>
        <div className="property-address">
          <strong>地址:</strong> {property.address}
        </div>
        <div className="property-price">
          <strong>要价:</strong> {formatPrice(property.askingPrice)}
        </div>
        <div className="property-type">
          <strong>房产类型:</strong> {property.propertyType}
        </div>
        {property.tags && property.tags.length > 0 && (
          <div className="property-tags">
            {property.tags.map((tag, index) => (
              <span key={index} className="property-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        {property.realtorCaLink && (
          <div className="property-link">
            <a 
              href={property.realtorCaLink} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              在 Realtor.ca 上查看 →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
