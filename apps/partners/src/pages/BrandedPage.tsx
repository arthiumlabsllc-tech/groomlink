import { useState, useEffect, useRef } from 'react'
import Icon from '../components/Icon'
import Layout from '../components/Layout'
import { api, BrandedPage } from '../lib/api'
import { useSalon } from '../store/SalonContext'

const BASE_URL = 'groomlinkgh.com/book'

export default function BrandedPageManager() {
  const { salon, salonId } = useSalon()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Form state
  const [primaryColor, setPrimaryColor] = useState('#CE1126')
  const [tagline, setTagline] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [slug, setSlug] = useState('')
  const [brandedPageId, setBrandedPageId] = useState<string | null>(null)

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch existing branded page
  useEffect(() => {
    const fetchBrandedPage = async () => {
      if (!salonId) return
      try {
        setLoading(true)
        const response = await api.getMyBrandedPage(salonId)
        if (response.success && response.data) {
          const page = response.data
          setBrandedPageId(page.id)
          setPrimaryColor(page.primaryColor || '#CE1126')
          setTagline(page.tagline || '')
          setLogoUrl(page.logoUrl || null)
          setIsPublished(page.isPublished)
          setSlug(page.slug)
        }
      } catch (err: any) {
        console.error('Error fetching branded page:', err)
        // If 404, it just means no branded page exists yet — that's fine
        if (!err?.message?.includes('404') && !err?.message?.includes('Not Found')) {
          setError('Failed to load branded page settings')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchBrandedPage()
  }, [salonId])

  // Auto-generate slug from business name
  useEffect(() => {
    if (!slug && salon?.businessName) {
      const generated = salon.businessName
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
      setSlug(generated)
    }
  }, [salon?.businessName, slug])

  const handleSave = async () => {
    if (!salonId) return
    try {
      setSaving(true)
      setError(null)
      setSaved(false)

      // Upload logo first if a new file was selected
      let finalLogoUrl = logoUrl
      if (logoFile && salonId) {
        setUploadingLogo(true)
        try {
          const uploadRes = await api.uploadBrandedPageLogo(salonId, logoFile)
          if (uploadRes.success && uploadRes.data?.logo) {
            finalLogoUrl = uploadRes.data.logo
            setLogoUrl(finalLogoUrl)
          }
        } catch (uploadErr) {
          console.error('Logo upload failed:', uploadErr)
          setError('Logo upload failed. Your other changes will still be saved.')
        } finally {
          setUploadingLogo(false)
        }
      }

      const response = await api.updateBrandedPage({
        salonId,
        primaryColor,
        tagline: tagline || undefined,
        logoUrl: finalLogoUrl || undefined,
        isPublished,
        slug: slug || undefined,
      })

      if (response.success && response.data) {
        const page = response.data
        setBrandedPageId(page.id)
        setSlug(page.slug)
        setPrimaryColor(page.primaryColor)
        setTagline(page.tagline || '')
        setLogoUrl(page.logoUrl || null)
        setIsPublished(page.isPublished)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save branded page')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyUrl = async () => {
    const url = `https://${BASE_URL}/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      // Preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Helper to compute contrast text color
  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#1a1a2e' : '#ffffff'
  }

  // Shimmer skeleton for loading state
  if (loading) {
    return (
      <Layout activeTab="booking page">
        <div className="page-enter max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="skeleton-shimmer h-8 w-48 mb-2" />
              <div className="skeleton-shimmer h-4 w-64" />
            </div>
            <div className="skeleton-shimmer h-10 w-32 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="skeleton-shimmer h-96 rounded-2xl" />
            <div className="space-y-6">
              <div className="skeleton-shimmer h-64 rounded-xl" />
              <div className="skeleton-shimmer h-48 rounded-xl" />
              <div className="skeleton-shimmer h-32 rounded-xl" />
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const pageUrl = `https://${BASE_URL}/${slug}`
  const contrastColor = getContrastColor(primaryColor)
  const salonName = salon?.businessName || 'My Salon'

  return (
    <Layout activeTab="booking page">
      <div className="max-w-7xl mx-auto page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Icon name="language" size={28} className="text-ghana-green" />
              Booking Page
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Customize your branded booking page and share it with customers
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || uploadingLogo}
            className="btn-primary btn-ripple flex items-center gap-2 px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {saving ? (
              <Icon name="progress_activity" size={16} className="animate-spin" />
            ) : saved ? (
              <Icon name="check" size={16} />
            ) : (
              <Icon name="save" size={16} />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded-lg transition-colors">
              <Icon name="close" size={18} />
            </button>
          </div>
        )}

        {/* Main Content: Split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Live Preview */}
          <div className="order-1 lg:order-1">
            <div className="sticky top-24">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Icon name="visibility" size={16} />
                Live Preview
              </h2>
              <div className="card-v2 overflow-hidden hover:shadow-2xl transition-shadow duration-500">
                {/* Preview Card Header with dynamic color */}
                <div
                  className="px-6 py-10 text-center transition-colors duration-300"
                  style={{ backgroundColor: primaryColor }}
                >
                  {/* Logo */}
                  <div className="mx-auto w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center overflow-hidden mb-5 shadow-lg">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Salon logo"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className="text-3xl font-bold" style={{ color: contrastColor }}>
                        {salonName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Salon Name */}
                  <h3 className="text-xl font-bold mb-2" style={{ color: contrastColor }}>
                    {salonName}
                  </h3>

                  {/* Tagline */}
                  <p className="text-sm opacity-90 max-w-xs mx-auto" style={{ color: contrastColor }}>
                    {tagline || 'Your tagline goes here'}
                  </p>
                </div>

                {/* Preview Body */}
                <div className="px-6 py-6 bg-white">
                  {/* Quick info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-5 justify-center">
                    {salon?.city && (
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                        {salon.city}
                      </span>
                    )}
                    {salon?.rating != null && salon.rating > 0 && (
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full">
                        <Icon name="star" size={12} className="text-ghana-gold" filled />
                        {salon!.rating}
                      </span>
                    )}
                  </div>

                  {/* Book Now Button Preview */}
                  <button
                    className="w-full py-3.5 rounded-xl font-semibold text-white text-center transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Book Now
                  </button>

                  {/* Services preview hint */}
                  <p className="text-xs text-gray-400 text-center mt-4">
                    Services & staff will appear below
                  </p>
                </div>

                {/* Preview Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
                  <span className="text-xs text-gray-400 font-medium">Powered by GroomLink</span>
                </div>
              </div>

              {/* Publication status badge */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full ${
                  isPublished
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isPublished ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                  {isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Customization Form */}
          <div className="order-2 lg:order-2 space-y-6">
            {/* Primary Color */}
            <div className="card-v2 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <div className="w-8 h-8 bg-ghana-green/10 rounded-lg flex items-center justify-center">
                  <Icon name="palette" size={16} className="text-ghana-green" />
                </div>
                Branding
              </h3>

              <div className="space-y-6">
                {/* Primary Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-14 h-14 rounded-xl cursor-pointer border-2 border-gray-200 p-1 transition-all hover:border-ghana-green hover:shadow-md"
                      />
                    </div>
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => {
                        const val = e.target.value
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                          setPrimaryColor(val)
                        }
                      }}
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-ghana-green/20 focus:border-ghana-green transition-all bg-gray-50/50"
                      placeholder="#CE1126"
                      maxLength={7}
                    />
                  </div>
                  {/* Preset colors */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {['#CE1126', '#1B5E20', '#0D47A1', '#4A148C', '#E65100', '#00695C', '#1a1a2e', '#D4AF37'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setPrimaryColor(color)}
                        className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 hover:shadow-md ${
                          primaryColor === color ? 'border-gray-900 ring-2 ring-gray-200 scale-105' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Tagline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value.slice(0, 100))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-ghana-green/20 focus:border-ghana-green transition-all bg-gray-50/50"
                    placeholder="e.g., Your go-to spot for fresh cuts & styles"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-400 mt-2 text-right font-medium">
                    {tagline.length}/100
                  </p>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 hover:border-ghana-green hover:bg-ghana-green/5 transition-all group cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Logo preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <Icon name="upload" size={24} className="text-gray-400 group-hover:text-ghana-green transition-colors" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="btn-secondary btn-ripple text-sm py-2 px-4 disabled:opacity-50"
                      >
                        {uploadingLogo ? 'Uploading...' : logoUrl ? 'Change logo' : 'Upload logo'}
                      </button>
                      {logoUrl && (
                        <button
                          onClick={handleRemoveLogo}
                          className="block text-sm text-red-500 hover:text-red-700 transition-colors font-medium"
                        >
                          Remove logo
                        </button>
                      )}
                      <p className="text-xs text-gray-400">PNG, JPG up to 2MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Page URL & Slug */}
            <div className="card-v2 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <div className="w-8 h-8 bg-ghana-green/10 rounded-lg flex items-center justify-center">
                  <Icon name="language" size={16} className="text-ghana-green" />
                </div>
                Booking Page URL
              </h3>

              {/* Slug editor */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Slug
                </label>
                <div className="flex items-center">
                  <span className="px-4 py-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-500 whitespace-nowrap font-medium">
                    {BASE_URL}/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 100))}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-r-xl text-sm font-mono focus:ring-2 focus:ring-ghana-green/20 focus:border-ghana-green transition-all bg-gray-50/50"
                    placeholder="your-salon"
                  />
                </div>
              </div>

              {/* Full URL display with copy */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="flex-1 text-sm text-gray-700 font-mono truncate">
                  {pageUrl}
                </span>
                <button
                  onClick={handleCopyUrl}
                  className="btn-secondary btn-ripple flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium"
                  title="Copy URL"
                >
                  {copied ? <Icon name="check" size={16} /> : <Icon name="content_copy" size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Open in new tab */}
              {isPublished && slug && (
                <a
                  href={pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-ghana-green hover:text-ghana-green/80 font-medium transition-colors hover:underline"
                >
                  <Icon name="open_in_new" size={14} />
                  View live page
                </a>
              )}
            </div>

            {/* Publish Toggle */}
            <div className="card-v2 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Publish Page
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                    When published, your booking page will be publicly accessible at the URL above
                  </p>
                </div>
                <button
                  onClick={() => setIsPublished(!isPublished)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ghana-green/20 focus:ring-offset-2 ${
                    isPublished ? 'bg-ghana-green' : 'bg-gray-300'
                  }`}
                  role="switch"
                  aria-checked={isPublished}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                      isPublished ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {!isPublished && (
                <div className="mt-4 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 px-4 py-3 rounded-xl border border-amber-200">
                  <Icon name="info" size={18} className="flex-shrink-0 mt-0.5" />
                  <p>Your booking page is currently in draft mode. Toggle this switch to make it live.</p>
                </div>
              )}
            </div>

            {/* Save button (mobile) */}
            <div className="lg:hidden">
              <button
                onClick={handleSave}
                disabled={saving || uploadingLogo}
                className="btn-primary btn-ripple w-full flex items-center justify-center gap-2 px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {saving ? (
                  <Icon name="progress_activity" size={18} className="animate-spin" />
                ) : saved ? (
                  <Icon name="check" size={18} />
                ) : (
                  <Icon name="save" size={18} />
                )}
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
