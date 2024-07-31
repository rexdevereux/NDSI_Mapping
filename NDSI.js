// Use the imported geometry directly
var westcoast = westcoast;

// Function to calculate Normalized Salinity Index (NDSI = (R - NIR) / (R + NIR))
function calculateNDSI(image) {
  var ndsi = image.expression(
    '(R - NIR) / (R + NIR)', {
      'R': image.select('B4'),
      'NIR': image.select('B8')
    }).rename('NDSI');
  return image.addBands(ndsi);
}

// Function to calculate and print summary statistics
function calculateStatistics(image, label) {
  var stats = image.reduceRegion({
    reducer: ee.Reducer.mean().combine({
      reducer2: ee.Reducer.median(),
      sharedInputs: true
    }).combine({
      reducer2: ee.Reducer.stdDev(),
      sharedInputs: true
    }).combine({
      reducer2: ee.Reducer.minMax(),
      sharedInputs: true
    }),
    geometry: westcoast,
    scale: 30,
    maxPixels: 1e9
  });
  print(label, stats);
}

// Function to export NDSI image to Google Drive
function exportNDSI(image, year, period) {
  Export.image.toDrive({
    image: image,
    description: 'NDSI_' + year + '_' + period,
    scale: 30,
    region: westcoast,
    fileFormat: 'GeoTIFF',
    maxPixels: 1e9
  });
}

// Define the periods and years
var periods = [
  {start: '01-01', end: '02-28', label: 'Jan-Feb'},
  {start: '05-01', end: '06-30', label: 'May-Jun'}
];
var years = [2018, 2019, 2020, 2021, 2022, 2023];

// Process NDSI images for each period and year
years.forEach(function(year) {
  periods.forEach(function(period) {
    var sentinel2 = ee.ImageCollection('COPERNICUS/S2')
                     .filterBounds(westcoast)
                     .filterDate(year + '-' + period.start, year + '-' + period.end)
                     .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) // Filter to remove cloudy images
                     .filter(ee.Filter.listContains('system:band_names', 'B4'))
                     .filter(ee.Filter.listContains('system:band_names', 'B8'));

    // Apply the NDSI calculation
    var ndsiCollection = sentinel2.map(calculateNDSI);

    // Get the median NDSI value for the period
    var ndsiMedian = ndsiCollection.select('NDSI').median().clip(westcoast);
    
    // Calculate and print statistics for the year and period
    calculateStatistics(ndsiMedian, 'NDSI ' + year + ' ' + period.label + ' - Statistics');
    
    // Display the NDSI layer for the year and period on the map
    var ndsiVizParams = {
      min: -1,
      max: 1,
      palette: ['#d53e4f', '#fdae61', '#ffffbf', '#3288bd', '#5e4fa2']  // Example using the Cividis color scale
    };
    Map.addLayer(ndsiMedian, ndsiVizParams, 'NDSI ' + year + ' ' + period.label);
    
    // Export the NDSI image to Google Drive
    exportNDSI(ndsiMedian, year, period.label);
  });
});

// Create the legend
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

var legendTitle = ui.Label({
  value: 'NDSI Salinity Index',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});

legend.add(legendTitle);

// Function to create a legend row
var makeRow = function(color, name) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });

  var description = ui.Label({
    value: name,
    style: {
      margin: '0 0 4px 6px'
    }
  });

  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

legend.add(makeRow('#d53e4f', 'Very Low'));
legend.add(makeRow('#fdae61', 'Low'));
legend.add(makeRow('#ffffbf', 'Moderate'));
legend.add(makeRow('#3288bd', 'High'));
legend.add(makeRow('#5e4fa2', 'Very High'));

Map.add(legend);

// Dark-styled base map
var snazzyBlack = [
  {
    featureType: 'administrative',
    elementType: 'all',
    stylers: [{visibility: 'off'}]
  },
  {
    featureType: 'administrative',
    elementType: 'labels.text.fill',
    stylers: [{color: '#444444'}]
  },
  {
    featureType: 'landscape',
    elementType: 'all',
    stylers: [{color: '#000000'}, {visibility: 'on'}]
  },
  {featureType: 'poi', elementType: 'all', stylers: [{visibility: 'off'}]}, {
    featureType: 'road',
    elementType: 'all',
    stylers: [{saturation: -100}, {lightness: 45}]
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{color: '#ffffff'}]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{color: '#eaeaea'}]
  },
  {featureType: 'road', elementType: 'labels', stylers: [{visibility: 'off'}]},
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{color: '#dedede'}]
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{visibility: 'off'}]
  },
  {
    featureType: 'road.highway',
    elementType: 'all',
    stylers: [{visibility: 'simplified'}]
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.icon',
    stylers: [{visibility: 'off'}]
  },
  {featureType: 'transit', elementType: 'all', stylers: [{visibility: 'off'}]},
  {
    featureType: 'water',
    elementType: 'all',
    stylers: [{color: '#434343'}, {visibility: 'on'}]
  }
];

var snazzyColor = [
  {elementType: 'labels', stylers: [{visibility: 'off'}]}, {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{color: '#0F0919'}]
  },
  {
    featureType: 'water',
    elementType: 'geometry.fill',
    stylers: [{color: '#E4F7F7'}]
  },
  {elementType: 'geometry.stroke', stylers: [{visibility: 'off'}]}, {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{color: '#002FA7'}]
  },
  {
    featureType: 'poi.attraction',
    elementType: 'geometry.fill',
    stylers: [{color: '#E60003'}]
  },
  {
    featureType: 'landscape',
    elementType: 'geometry.fill',
    stylers: [{color: '#FBFCF4'}]
  },
  {
    featureType: 'poi.business',
    elementType: 'geometry.fill',
    stylers: [{color: '#FFED00'}]
  },
  {
    featureType: 'poi.government',
    elementType: 'geometry.fill',
    stylers: [{color: '#D41C1D'}]
  },
  {
    featureType: 'poi.school',
    elementType: 'geometry.fill',
    stylers: [{color: '#BF0000'}]
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry.fill',
    stylers: [{saturation: -100}]
  }
];

Map.setOptions(
    'snazzyBlack', {snazzyBlack: snazzyBlack, snazzyColor: snazzyColor});
