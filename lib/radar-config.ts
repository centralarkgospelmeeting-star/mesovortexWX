export const RADAR_SITES = [
  // Arkansas & nearby (priority)
  { id: 'KLZK', radarId: 'LZK', name: 'Little Rock, AR', lat: 34.836, lon: -92.262, elevation: 570 },
  { id: 'KSRX', radarId: 'SRX', name: 'Fort Smith, AR', lat: 35.290, lon: -94.362, elevation: 640 },
  { id: 'KNQA', radarId: 'NQA', name: 'Memphis, TN', lat: 35.345, lon: -89.873, elevation: 280 },
  { id: 'KPAH', radarId: 'PAH', name: 'Paducah, KY', lat: 37.068, lon: -88.772, elevation: 360 },
  { id: 'KSGF', radarId: 'SGF', name: 'Springfield, MO', lat: 37.235, lon: -93.401, elevation: 1278 },

  // Southern Plains
  { id: 'KTLX', radarId: 'TLX', name: 'Oklahoma City / Norman, OK', lat: 35.333, lon: -97.278, elevation: 370 },
  { id: 'KOUN', radarId: 'OUN', name: 'Norman, OK (Research)', lat: 35.236, lon: -97.462, elevation: 1170 },
  { id: 'KFDR', radarId: 'FDR', name: 'Frederick, OK', lat: 34.362, lon: -98.976, elevation: 1260 },
  { id: 'KINX', radarId: 'INX', name: 'Tulsa, OK', lat: 36.175, lon: -95.564, elevation: 668 },
  { id: 'KAMA', radarId: 'AMA', name: 'Amarillo, TX', lat: 35.233, lon: -101.709, elevation: 3585 },
  { id: 'KLBB', radarId: 'LBB', name: 'Lubbock, TX', lat: 33.654, lon: -101.814, elevation: 3255 },
  { id: 'KMAF', radarId: 'MAF', name: 'Midland / Odessa, TX', lat: 31.943, lon: -102.189, elevation: 2860 },
  { id: 'KSJT', radarId: 'SJT', name: 'San Angelo, TX', lat: 31.371, lon: -100.492, elevation: 1890 },
  { id: 'KFWS', radarId: 'FWS', name: 'Dallas / Fort Worth, TX', lat: 32.573, lon: -97.303, elevation: 683 },
  { id: 'KDYX', radarId: 'DYX', name: 'Dyess AFB / Abilene, TX', lat: 32.538, lon: -99.254, elevation: 1510 },
  { id: 'KEWX', radarId: 'EWX', name: 'Austin / San Antonio, TX', lat: 29.704, lon: -98.028, elevation: 630 },
  { id: 'KGRK', radarId: 'GRK', name: 'Fort Hood / Killeen, TX', lat: 30.722, lon: -97.383, elevation: 538 },
  { id: 'KHGX', radarId: 'HGX', name: 'Houston / Galveston, TX', lat: 29.472, lon: -95.079, elevation: 18 },
  { id: 'KCRP', radarId: 'CRP', name: 'Corpus Christi, TX', lat: 27.784, lon: -97.511, elevation: 46 },
  { id: 'KBRO', radarId: 'BRO', name: 'Brownsville, TX', lat: 25.916, lon: -97.419, elevation: 23 },
  { id: 'KEPZ', radarId: 'EPZ', name: 'El Paso, TX', lat: 31.873, lon: -106.698, elevation: 4100 },
  { id: 'KDFX', radarId: 'DFX', name: 'Laughlin AFB / Del Rio, TX', lat: 29.273, lon: -100.280, elevation: 1131 },

  // Central / Midwest
  { id: 'KICT', radarId: 'ICT', name: 'Wichita, KS', lat: 37.654, lon: -97.443, elevation: 1333 },
  { id: 'KDDC', radarId: 'DDC', name: 'Dodge City, KS', lat: 37.761, lon: -99.969, elevation: 2590 },
  { id: 'KGLD', radarId: 'GLD', name: 'Goodland, KS', lat: 39.367, lon: -101.700, elevation: 3650 },
  { id: 'KTWX', radarId: 'TWX', name: 'Topeka, KS', lat: 38.9969, lon: -96.2325, elevation: 1367 },
  { id: 'KEAX', radarId: 'EAX', name: 'Kansas City, MO', lat: 38.810, lon: -94.264, elevation: 995 },
  { id: 'KLSX', radarId: 'LSX', name: 'St. Louis, MO', lat: 38.699, lon: -90.683, elevation: 608 },
  { id: 'KIND', radarId: 'IND', name: 'Indianapolis, IN', lat: 39.708, lon: -86.280, elevation: 790 },
  { id: 'KVWX', radarId: 'VWX', name: 'Evansville, IN', lat: 38.260, lon: -87.724, elevation: 386 },
  { id: 'KILX', radarId: 'ILX', name: 'Lincoln, IL', lat: 40.151, lon: -89.337, elevation: 580 },
  { id: 'KLOT', radarId: 'LOT', name: 'Chicago, IL', lat: 41.604, lon: -88.085, elevation: 663 },
  { id: 'KDVN', radarId: 'DVN', name: 'Davenport, IA', lat: 41.612, lon: -90.581, elevation: 754 },
  { id: 'KDMX', radarId: 'DMX', name: 'Des Moines, IA', lat: 41.731, lon: -93.723, elevation: 981 },
  { id: 'KOAX', radarId: 'OAX', name: 'Omaha, NE', lat: 41.320, lon: -96.366, elevation: 1140 },
  { id: 'KUEX', radarId: 'UEX', name: 'Hastings, NE', lat: 40.321, lon: -98.442, elevation: 1970 },
  { id: 'KLNX', radarId: 'LNX', name: 'North Platte, NE', lat: 41.958, lon: -100.576, elevation: 2970 },

  // Southeast
  { id: 'KBMX', radarId: 'BMX', name: 'Birmingham, AL', lat: 33.172, lon: -86.770, elevation: 645 },
  { id: 'KHTX', radarId: 'HTX', name: 'Huntsville, AL', lat: 34.931, lon: -86.084, elevation: 1760 },
  { id: 'KMOB', radarId: 'MOB', name: 'Mobile, AL', lat: 30.679, lon: -88.240, elevation: 208 },
  { id: 'KEOX', radarId: 'EOX', name: 'Fort Rucker, AL', lat: 31.460, lon: -85.459, elevation: 326 },
  { id: 'KFFC', radarId: 'FFC', name: 'Atlanta, GA', lat: 33.363, lon: -84.566, elevation: 866 },
  { id: 'KJGX', radarId: 'JGX', name: 'Robins AFB, GA', lat: 32.675, lon: -83.351, elevation: 521 },
  { id: 'KVAX', radarId: 'VAX', name: 'Moody AFB, GA', lat: 30.890, lon: -83.002, elevation: 178 },
  { id: 'KCLX', radarId: 'CLX', name: 'Charleston, SC', lat: 32.655, lon: -81.042, elevation: 97 },
  { id: 'KCAE', radarId: 'CAE', name: 'Columbia, SC', lat: 33.949, lon: -81.118, elevation: 231 },
  { id: 'KGSP', radarId: 'GSP', name: 'Greer, SC', lat: 34.883, lon: -82.220, elevation: 940 },
  { id: 'KLTX', radarId: 'LTX', name: 'Wilmington, NC', lat: 33.989, lon: -78.429, elevation: 64 },
  { id: 'KRAX', radarId: 'RAX', name: 'Raleigh / Durham, NC', lat: 35.665, lon: -78.490, elevation: 348 },
  { id: 'KMHX', radarId: 'MHX', name: 'Morehead City, NC', lat: 34.776, lon: -76.876, elevation: 31 },
  { id: 'KMRX', radarId: 'MRX', name: 'Knoxville / Morristown, TN', lat: 36.168, lon: -83.402, elevation: 1330 },
  { id: 'KOHX', radarId: 'OHX', name: 'Nashville, TN', lat: 36.247, lon: -86.563, elevation: 568 },
  { id: 'KHPX', radarId: 'HPX', name: 'Fort Campbell, KY', lat: 36.737, lon: -87.285, elevation: 576 },
  { id: 'KJKL', radarId: 'JKL', name: 'Jackson, KY', lat: 37.591, lon: -83.313, elevation: 1364 },
  { id: 'KLVX', radarId: 'LVX', name: 'Louisville, KY', lat: 38.006, lon: -85.944, elevation: 719 },

  // Florida & Gulf
  { id: 'KMLB', radarId: 'MLB', name: 'Melbourne, FL', lat: 28.113, lon: -80.654, elevation: 35 },
  { id: 'KTBW', radarId: 'TBW', name: 'Tampa Bay, FL', lat: 27.705, lon: -82.402, elevation: 41 },
  { id: 'KAMX', radarId: 'AMX', name: 'Miami, FL', lat: 25.611, lon: -80.413, elevation: 14 },
  { id: 'KBYX', radarId: 'BYX', name: 'Key West, FL', lat: 24.597, lon: -81.703, elevation: 8 },
  { id: 'KJAX', radarId: 'JAX', name: 'Jacksonville, FL', lat: 30.485, lon: -81.702, elevation: 33 },
  { id: 'KEVX', radarId: 'EVX', name: 'Eglin AFB, FL', lat: 30.565, lon: -85.922, elevation: 140 },
  { id: 'KTLH', radarId: 'TLH', name: 'Tallahassee, FL', lat: 30.398, lon: -84.329, elevation: 63 },

  // Northeast / Mid-Atlantic
  { id: 'KLWX', radarId: 'LWX', name: 'Sterling, VA (DC area)', lat: 38.975, lon: -77.487, elevation: 313 },
  { id: 'KAKQ', radarId: 'AKQ', name: 'Wakefield, VA', lat: 36.984, lon: -77.007, elevation: 112 },
  { id: 'KFCX', radarId: 'FCX', name: 'Roanoke, VA', lat: 37.024, lon: -80.274, elevation: 2860 },
  { id: 'KPBZ', radarId: 'PBZ', name: 'Pittsburgh, PA', lat: 40.532, lon: -80.218, elevation: 1180 },
  { id: 'KCCX', radarId: 'CCX', name: 'State College, PA', lat: 40.923, lon: -78.004, elevation: 2400 },
  { id: 'KDIX', radarId: 'DIX', name: 'Philadelphia, PA', lat: 39.947, lon: -74.411, elevation: 149 },
  { id: 'KOKX', radarId: 'OKX', name: 'New York City, NY', lat: 40.866, lon: -72.864, elevation: 85 },
  { id: 'KENX', radarId: 'ENX', name: 'Albany, NY', lat: 42.586, lon: -74.064, elevation: 1826 },
  { id: 'KBUF', radarId: 'BUF', name: 'Buffalo, NY', lat: 42.949, lon: -78.737, elevation: 693 },
  { id: 'KTYX', radarId: 'TYX', name: 'Montague, NY', lat: 43.756, lon: -75.680, elevation: 1840 },
  { id: 'KBOX', radarId: 'BOX', name: 'Boston, MA', lat: 41.956, lon: -71.137, elevation: 118 },
  { id: 'KGYX', radarId: 'GYX', name: 'Portland, ME', lat: 43.891, lon: -70.256, elevation: 410 },

  // Great Lakes / Upper Midwest
  { id: 'KGRR', radarId: 'GRR', name: 'Grand Rapids, MI', lat: 42.894, lon: -85.545, elevation: 780 },
  { id: 'KDTX', radarId: 'DTX', name: 'Detroit, MI', lat: 42.700, lon: -83.472, elevation: 1075 },
  { id: 'KAPX', radarId: 'APX', name: 'Gaylord, MI', lat: 44.907, lon: -84.720, elevation: 1464 },
  { id: 'KMQT', radarId: 'MQT', name: 'Marquette, MI', lat: 46.531, lon: -87.548, elevation: 1410 },
  { id: 'KMKX', radarId: 'MKX', name: 'Milwaukee, WI', lat: 42.968, lon: -88.551, elevation: 958 },
  { id: 'KGRB', radarId: 'GRB', name: 'Green Bay, WI', lat: 44.499, lon: -88.111, elevation: 682 },
  { id: 'KARX', radarId: 'ARX', name: 'La Crosse, WI', lat: 43.823, lon: -91.191, elevation: 1270 },
  { id: 'KMPX', radarId: 'MPX', name: 'Minneapolis, MN', lat: 44.849, lon: -93.565, elevation: 946 },
  { id: 'KDLH', radarId: 'DLH', name: 'Duluth, MN', lat: 46.837, lon: -92.210, elevation: 1428 },

  // High Plains / Rockies / West
  { id: 'KCYS', radarId: 'CYS', name: 'Cheyenne, WY', lat: 41.152, lon: -104.806, elevation: 6120 },
  { id: 'KRIW', radarId: 'RIW', name: 'Riverton, WY', lat: 43.066, lon: -108.477, elevation: 5560 },
  { id: 'KFTG', radarId: 'FTG', name: 'Denver / Boulder, CO', lat: 39.786, lon: -104.546, elevation: 5490 },
  { id: 'KPUX', radarId: 'PUX', name: 'Pueblo, CO', lat: 38.460, lon: -104.181, elevation: 5240 },
  { id: 'KGJX', radarId: 'GJX', name: 'Grand Junction, CO', lat: 39.062, lon: -108.214, elevation: 9990 },
  { id: 'KABX', radarId: 'ABX', name: 'Albuquerque, NM', lat: 35.150, lon: -106.824, elevation: 5870 },
  { id: 'KFDX', radarId: 'FDX', name: 'Cannon AFB, NM', lat: 34.634, lon: -103.619, elevation: 4180 },
  { id: 'KHDX', radarId: 'HDX', name: 'Holloman AFB, NM', lat: 33.077, lon: -106.120, elevation: 4220 },
  { id: 'KICX', radarId: 'ICX', name: 'Cedar City, UT', lat: 37.591, lon: -112.862, elevation: 10600 },
  { id: 'KMTX', radarId: 'MTX', name: 'Salt Lake City, UT', lat: 41.263, lon: -112.448, elevation: 6460 },
  { id: 'KSFX', radarId: 'SFX', name: 'Pocatello / Idaho Falls, ID', lat: 43.106, lon: -112.686, elevation: 4470 },
  { id: 'KCBX', radarId: 'CBX', name: 'Boise, ID', lat: 43.490, lon: -116.236, elevation: 3060 },
  { id: 'KOTX', radarId: 'OTX', name: 'Spokane, WA', lat: 47.680, lon: -117.627, elevation: 2380 },
  { id: 'KATX', radarId: 'ATX', name: 'Seattle / Tacoma, WA', lat: 48.195, lon: -122.496, elevation: 499 },
  { id: 'KRTX', radarId: 'RTX', name: 'Portland, OR', lat: 45.715, lon: -122.965, elevation: 1570 },
  { id: 'KMAX', radarId: 'MAX', name: 'Medford, OR', lat: 42.081, lon: -122.717, elevation: 7510 },
  { id: 'KBBX', radarId: 'BBX', name: 'Beale AFB, CA', lat: 39.496, lon: -121.632, elevation: 167 },
  { id: 'KDAX', radarId: 'DAX', name: 'Sacramento, CA', lat: 38.501, lon: -121.678, elevation: 30 },
  { id: 'KMUX', radarId: 'MUX', name: 'San Francisco, CA', lat: 37.155, lon: -121.898, elevation: 3469 },
  { id: 'KHNX', radarId: 'HNX', name: 'San Joaquin Valley, CA', lat: 36.314, lon: -119.632, elevation: 243 },
  { id: 'KVBX', radarId: 'VBX', name: 'Vandenberg AFB, CA', lat: 34.838, lon: -120.398, elevation: 1233 },
  { id: 'KSOX', radarId: 'SOX', name: 'Santa Ana Mountains, CA', lat: 33.818, lon: -117.636, elevation: 3027 },
  { id: 'KNKX', radarId: 'NKX', name: 'San Diego, CA', lat: 32.919, lon: -117.042, elevation: 955 },
  { id: 'KEYX', radarId: 'EYX', name: 'Edwards AFB, CA', lat: 35.098, lon: -117.561, elevation: 2757 },
  { id: 'KESX', radarId: 'ESX', name: 'Las Vegas, NV', lat: 35.701, lon: -114.892, elevation: 4867 },
  { id: 'KRGX', radarId: 'RGX', name: 'Reno, NV', lat: 39.754, lon: -119.462, elevation: 8200 },
  { id: 'KFSX', radarId: 'FSX', name: 'Flagstaff, AZ', lat: 34.574, lon: -111.198, elevation: 7417 },
  { id: 'KIWA', radarId: 'IWA', name: 'Phoenix, AZ', lat: 33.289, lon: -111.670, elevation: 1353 },
  { id: 'KYUX', radarId: 'YUX', name: 'Yuma, AZ', lat: 32.495, lon: -114.657, elevation: 174 },

  // Added: previously missing NEXRAD sites
  { id: 'KSHV', radarId: 'SHV', name: 'Shreveport, LA', lat: 32.4508, lon: -93.8412, elevation: 273 },
  { id: 'KLCH', radarId: 'LCH', name: 'Lake Charles, LA', lat: 30.1253, lon: -93.2158, elevation: 13 },
  { id: 'KLIX', radarId: 'LIX', name: 'New Orleans, LA', lat: 30.3367, lon: -89.8255, elevation: 24 },
  { id: 'KPOE', radarId: 'POE', name: 'Fort Polk, LA', lat: 31.1553, lon: -92.9764, elevation: 407 },
  { id: 'KGWX', radarId: 'GWX', name: 'Columbus AFB, MS', lat: 33.8969, lon: -88.3288, elevation: 476 },
  { id: 'KDGX', radarId: 'DGX', name: 'Jackson/Brandon, MS', lat: 32.2799, lon: -89.9844, elevation: 540 },
  { id: 'KMXX', radarId: 'MXX', name: 'Maxwell AFB, AL', lat: 32.5367, lon: -85.7898, elevation: 400 },
  { id: 'KEMX', radarId: 'EMX', name: 'Tucson, AZ', lat: 31.8937, lon: -110.6303, elevation: 5202 },
  { id: 'KVTX', radarId: 'VTX', name: 'Los Angeles, CA', lat: 34.4116, lon: -119.1796, elevation: 2807 },
  { id: 'KBHX', radarId: 'BHX', name: 'Eureka, CA', lat: 40.4986, lon: -124.2919, elevation: 2402 },
  { id: 'KLRX', radarId: 'LRX', name: 'Elko, NV', lat: 40.7397, lon: -116.8027, elevation: 6744 },
  { id: 'KCBW', radarId: 'CBW', name: 'Houlton/Caribou, ME', lat: 46.0392, lon: -67.8064, elevation: 746 },
  { id: 'KCXX', radarId: 'CXX', name: 'Burlington, VT', lat: 44.5110, lon: -73.1664, elevation: 317 },
  { id: 'KBGM', radarId: 'BGM', name: 'Binghamton, NY', lat: 42.1997, lon: -75.9847, elevation: 1637 },
  { id: 'KDOX', radarId: 'DOX', name: 'Dover AFB, DE', lat: 38.8257, lon: -75.4400, elevation: 50 },
  { id: 'KRLX', radarId: 'RLX', name: 'Charleston, WV', lat: 38.3119, lon: -81.7239, elevation: 1080 },
  { id: 'KCLE', radarId: 'CLE', name: 'Cleveland, OH', lat: 41.4131, lon: -81.8597, elevation: 763 },
  { id: 'KILN', radarId: 'ILN', name: 'Wilmington/Cincinnati, OH', lat: 39.4203, lon: -83.8217, elevation: 1056 },
  { id: 'KIWX', radarId: 'IWX', name: 'North Webster, IN', lat: 41.3586, lon: -85.7000, elevation: 960 },
  { id: 'KABR', radarId: 'ABR', name: 'Aberdeen, SD', lat: 45.4558, lon: -98.4131, elevation: 1302 },
  { id: 'KBIS', radarId: 'BIS', name: 'Bismarck, ND', lat: 46.7708, lon: -100.7606, elevation: 1658 },
  { id: 'KFSD', radarId: 'FSD', name: 'Sioux Falls, SD', lat: 43.5878, lon: -96.7294, elevation: 1430 },
  { id: 'KMVX', radarId: 'MVX', name: 'Grand Forks, ND', lat: 47.5281, lon: -97.3256, elevation: 986 },
  { id: 'KMBX', radarId: 'MBX', name: 'Minot AFB, ND', lat: 48.3931, lon: -100.8644, elevation: 1493 },
  { id: 'KUDX', radarId: 'UDX', name: 'Rapid City, SD', lat: 44.1250, lon: -102.8294, elevation: 3016 },
  { id: 'KBLX', radarId: 'BLX', name: 'Billings, MT', lat: 45.8538, lon: -108.6068, elevation: 3598 },
  { id: 'KGGW', radarId: 'GGW', name: 'Glasgow, MT', lat: 48.2064, lon: -106.6247, elevation: 2277 },
  { id: 'KTFX', radarId: 'TFX', name: 'Great Falls, MT', lat: 47.4597, lon: -111.3853, elevation: 3714 },
  { id: 'KMSX', radarId: 'MSX', name: 'Missoula, MT', lat: 47.0410, lon: -113.9862, elevation: 7855 },
  { id: 'KPDT', radarId: 'PDT', name: 'Pendleton, OR', lat: 45.6906, lon: -118.8528, elevation: 1516 },
  { id: 'KVNX', radarId: 'VNX', name: 'Vance AFB, OK', lat: 36.7408, lon: -98.1278, elevation: 1214 },
  { id: 'PABC', radarId: 'ABC', name: 'Bethel, AK', lat: 60.7919, lon: -161.8764, elevation: 162 },
  { id: 'PACG', radarId: 'ACG', name: 'Sitka/Biorka Island, AK', lat: 56.8528, lon: -135.5292, elevation: 209 },
  { id: 'PAEC', radarId: 'AEC', name: 'Nome, AK', lat: 64.5114, lon: -165.2950, elevation: 54 },
  { id: 'PAHG', radarId: 'AHG', name: 'Kenai/Anchorage, AK', lat: 60.7260, lon: -151.3514, elevation: 242 },
  { id: 'PAIH', radarId: 'AIH', name: 'Middleton Island, AK', lat: 59.4614, lon: -146.3031, elevation: 67 },
  { id: 'PAKC', radarId: 'AKC', name: 'King Salmon, AK', lat: 58.6794, lon: -156.6294, elevation: 63 },
  { id: 'PAPD', radarId: 'APD', name: 'Fairbanks/Pedro Dome, AK', lat: 65.0351, lon: -147.5014, elevation: 2590 },
  { id: 'PHKI', radarId: 'HKI', name: 'South Kauai, HI', lat: 21.8940, lon: -159.5520, elevation: 179 },
  { id: 'PHKM', radarId: 'HKM', name: 'Kamuela/Kohala, HI', lat: 20.1255, lon: -155.7781, elevation: 3964 },
  { id: 'PHMO', radarId: 'HMO', name: 'Molokai, HI', lat: 21.1328, lon: -157.1800, elevation: 1363 },
  { id: 'PHWA', radarId: 'HWA', name: 'South Shore, HI', lat: 19.0950, lon: -155.5689, elevation: 1380 },
  { id: 'TJUA', radarId: 'JUA', name: 'San Juan, PR', lat: 18.1156, lon: -66.0781, elevation: 2790 },

  { id: 'KLGX', radarId: 'LGX', name: 'Langley Hill, WA', lat: 47.1169, lon: -124.1067, elevation: 366 },
  { id: 'KHDC', radarId: 'HDC', name: 'Hammond, LA', lat: 30.5193, lon: -90.4074, elevation: 43 },
  { id: 'PGUA', radarId: 'GUA', name: 'Andersen AFB, Guam', lat: 13.4558, lon: 144.8111, elevation: 386 },
] as const;
/** Haversine distance in km */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Haversine distance in km */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Return the nearest NEXRAD sites to a lat/lon. */
export function findNearestRadar(
  lat: number,
  lon: number,
  options?: { limit?: number; maxKm?: number }
): { site: (typeof RADAR_SITES)[number]; distanceKm: number }[] {
  const limit = options?.limit ?? 5;
  const maxKm = options?.maxKm ?? 500;
  return RADAR_SITES.map((site) => ({
    site,
    distanceKm: haversineKm(lat, lon, site.lat, site.lon),
  }))
    .filter((r) => r.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/** Auto-select nearest radar ID (defaults to KLZK). */
export function autoSelectNearestRadar(lat: number, lon: number): string {
  const nearest = findNearestRadar(lat, lon, { limit: 1, maxKm: 400 });
  return nearest[0]?.site.id ?? 'KLZK';
}
export type { RadarProductKey, RadarProductDef, FrameProvenance } from './product-registry';
export { RADAR_PRODUCTS, getProductDef } from './product-registry';

export const NEXRAD_PRODUCT_CODES: Record<string, string> = {
  ref: 'N0Q',
  vel: 'N0U',
  srvel: 'N0S',
  cc: 'N0C',
  zdr: 'N0X',
  kdp: 'N0K',
};
