import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory (root of project)
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Test endpoint to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend server is running!', apiKeyConfigured: !!process.env.REPLIERS_API_KEY });
});

// API endpoint to fetch properties
app.get('/api/properties', async (req, res) => {
  try {
    const apiKey = process.env.REPLIERS_API_KEY;
    const searchType = req.query.type || 'bargain';
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Repliers API key not configured. Please set REPLIERS_API_KEY in .env file' 
      });
    }

    // Call Repliers API to get properties in Ontario
    // Note: Status must be 'A' (Active) or 'U' (Unknown) according to API
    const response = await fetch('https://api.repliers.io/listings?province=ON&status=A', {
      method: 'GET',
      headers: {
        'REPLIERS-API-KEY': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Repliers API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Handle different possible response structures
    const listings = data.listings || data.results || data.data || (Array.isArray(data) ? data : []);
    
    console.log(`Received ${listings.length} listings from API for search type: ${searchType}`);
    
    // Filter properties based on the search type
    let filteredProperties = [];
    switch (searchType) {
      case 'fixer':
        filteredProperties = filterFixerProperties(listings);
        break;
      case 'school':
        filteredProperties = await filterSchoolProperties(listings);
        break;
      case 'subway':
        filteredProperties = await filterSubwayProperties(listings);
        break;
      case 'bargain':
      default:
        filteredProperties = filterProperties(listings);
        break;
    }
    
    console.log(`Filtered to ${filteredProperties.length} properties matching criteria`);
    
    // Format properties for the frontend
    const formattedProperties = filteredProperties.map(property => {
      const tags = searchType === 'bargain' ? getBargainTags(property) : [];
      return {
        mlsNumber: property.mlsNumber || property.mls || '',
        address: formatAddress(property),
        askingPrice: property.listPrice || property.price || 0,
        propertyType: property.details?.propertyType || property.type || 'Unknown',
        thumbnail: property.images?.[0] || '',
        realtorCaLink: `https://www.realtor.ca/real-estate/${property.mlsNumber || property.mls || ''}`,
        tags: tags
      };
    });

    res.json({ properties: formattedProperties });
  } catch (error) {
    console.error('Error fetching properties:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      details: error.stack 
    });
  }
});

// Helper function to format address
function formatAddress(property) {
  const addr = property.address;
  if (!addr) return 'Address not available';
  
  const streetParts = [];
  if (addr.streetNumber) streetParts.push(addr.streetNumber);
  if (addr.streetName) streetParts.push(addr.streetName);
  if (addr.streetSuffix) streetParts.push(addr.streetSuffix);
  if (addr.unitNumber) streetParts.push(`Unit ${addr.unitNumber}`);
  
  const streetAddress = streetParts.join(' ');
  
  const addressParts = [];
  if (streetAddress) addressParts.push(streetAddress);
  if (addr.city) addressParts.push(addr.city);
  if (addr.state) addressParts.push(addr.state);
  if (addr.zip) addressParts.push(addr.zip);
  
  return addressParts.join(', ') || 'Address not available';
}

// Get tags for "捡漏房" properties based on criteria
function getBargainTags(property) {
  const tags = [];
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const twoMonthsInDays = 60;

  // Tag 1: "long time no sold" - on market >= 2 months
  const daysOnMarket = property.simpleDaysOnMarket !== null && property.simpleDaysOnMarket !== undefined 
    ? property.simpleDaysOnMarket 
    : (property.listDate ? Math.floor((now - new Date(property.listDate)) / (1000 * 60 * 60 * 24)) : 0);
  if (daysOnMarket >= twoMonthsInDays) {
    tags.push('long time no sold');
  }

  // Tag 2: "reposted" - has terminated listing in past year
  const terminatedDate = property.timestamps?.terminatedDate ? new Date(property.timestamps.terminatedDate) : null;
  if (terminatedDate && terminatedDate >= oneYearAgo) {
    tags.push('reposted');
  }

  // Tag 3: "selling at a loss" - current price < purchase price
  const originalPrice = property.originalPrice || property.soldPrice;
  if (originalPrice && property.listPrice && property.listPrice > 0 && property.listPrice < originalPrice) {
    tags.push('selling at a loss');
  }

  // Tag 4: "selling at huge profit" - current price >= 100% higher than purchase price
  if (originalPrice && property.listPrice && property.listPrice > 0 && property.listPrice >= originalPrice * 2) {
    tags.push('selling at huge profit');
  }

  // Tag 5: "quicky" - quick deal (close date within 30 days)
  const possessionDate = property.timestamps?.possessionDate ? new Date(property.timestamps.possessionDate) : null;
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  if (possessionDate && possessionDate <= thirtyDaysFromNow && possessionDate >= now) {
    tags.push('quicky');
  }

  // Tag 6: "last deal fell through" - conditional sale that didn't close
  const conditionalExpiryDate = property.timestamps?.conditionalExpiryDate;
  const closedDate = property.timestamps?.closedDate;
  if (conditionalExpiryDate && !closedDate) {
    tags.push('last deal fell through');
  }

  // Tag 7: "estate sell" - estate sale
  const description = property.details?.description || '';
  if (description.toLowerCase().includes('estate')) {
    tags.push('estate sell');
  }

  return tags;
}

// Filter properties based on the specified criteria
function filterProperties(properties) {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const twoMonthsInDays = 60; // Approximate 2 months in days

  return properties.filter(property => {
    // Criterion 1: Have been on the market for at least 2 months
    const daysOnMarket = property.simpleDaysOnMarket !== null && property.simpleDaysOnMarket !== undefined 
      ? property.simpleDaysOnMarket 
      : (property.listDate ? Math.floor((now - new Date(property.listDate)) / (1000 * 60 * 60 * 24)) : 0);
    const onMarket2Months = daysOnMarket >= twoMonthsInDays;

    // Criterion 2: Have at least 1 "terminated" status listing in the past year
    const terminatedDate = property.timestamps?.terminatedDate ? new Date(property.timestamps.terminatedDate) : null;
    const hasTerminatedListing = terminatedDate && terminatedDate >= oneYearAgo;

    // Criterion 3: Current market price is lower than what they bought for
    const originalPrice = property.originalPrice || property.soldPrice;
    const priceBelowPurchase = originalPrice && property.listPrice && property.listPrice > 0 && 
                                property.listPrice < originalPrice;

    // Criterion 4: Current market price is at least 100% higher than what they bought for
    const priceDoublePurchase = originalPrice && property.listPrice && property.listPrice > 0 && 
                                 property.listPrice >= originalPrice * 2;

    // Criterion 5: They ask for quick deal (close date within 30 days)
    const possessionDate = property.timestamps?.possessionDate ? new Date(property.timestamps.possessionDate) : null;
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const quickClose = possessionDate && possessionDate <= thirtyDaysFromNow && possessionDate >= now;

    // Criterion 6: Their last listing had a deal fell through
    const conditionalExpiryDate = property.timestamps?.conditionalExpiryDate;
    const closedDate = property.timestamps?.closedDate;
    const dealFellThrough = conditionalExpiryDate && !closedDate;

    // Criterion 7: Estate sells
    const description = property.details?.description || '';
    const isEstateSale = description.toLowerCase().includes('estate');

    // Return true if property satisfies at least one criterion
    return onMarket2Months || hasTerminatedListing || priceBelowPurchase || 
           priceDoublePurchase || quickClose || dealFellThrough || isEstateSale;
  });
}

// Filter properties for "翻修房" - properties with "sold as is" in description
function filterFixerProperties(properties) {
  return properties.filter(property => {
    const description = property.details?.description || '';
    return description.toLowerCase().includes('sold as is');
  });
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Helper function to calculate walking time in minutes (assuming 5 km/h walking speed)
function calculateWalkingTime(distanceKm) {
  const walkingSpeedKmh = 5;
  return (distanceKm / walkingSpeedKmh) * 60; // Time in minutes
}

// Filter properties for "学区房" - properties within 10km of schools rated 9.0+
// Note: This requires integration with a school data API (e.g., school rating database)
// For now, this is a placeholder that returns all properties with coordinates
// Full implementation requires external school data API
async function filterSchoolProperties(properties) {
  // TODO: Integrate with school data API to get schools with ratings 9.0+
  // For now, return properties that have coordinates (as a placeholder)
  // In production, you would:
  // 1. Get list of schools with ratings >= 9.0 from school database/API
  // 2. For each property, check if it's within 10km of any high-rated school
  // 3. Return matching properties
  
  return properties.filter(property => {
    const lat = property.map?.latitude;
    const lon = property.map?.longitude;
    // Placeholder: return properties with coordinates
    // Full implementation requires school data API
    return lat && lon;
  });
}

// Filter properties for "5分钟内到地铁" - properties within 5 min walk of subway stations
// Note: This requires integration with transit/subway data API
// For now, this is a placeholder that returns all properties with coordinates
// Full implementation requires external transit API (e.g., Google Maps, Transit API)
async function filterSubwayProperties(properties) {
  // TODO: Integrate with transit/subway API to get subway station locations
  // For now, return properties that have coordinates (as a placeholder)
  // In production, you would:
  // 1. Get list of subway station coordinates from transit API
  // 2. For each property, calculate walking distance to nearest subway station
  // 3. If walking time <= 5 minutes, include the property
  // 4. Return matching properties
  
  // Placeholder implementation - in production, you'd need:
  // - Transit API key (e.g., Google Maps, TTC API for Toronto)
  // - Subway station data
  // - Walking distance/routing calculation
  
  return properties.filter(property => {
    const lat = property.map?.latitude;
    const lon = property.map?.longitude;
    // Placeholder: return properties with coordinates
    // Full implementation requires transit/subway data API
    return lat && lon;
  });
}

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
