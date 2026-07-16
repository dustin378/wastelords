export default {
 "width": 1200,
 "height": 800,
 "territories": [
  {
   "id": "t0",
   "name": "The Rustyards",
   "cx": 121,
   "cy": 75,
   "poly": [
    [
     8,
     8
    ],
    [
     253,
     8
    ],
    [
     259,
     125
    ],
    [
     219,
     172
    ],
    [
     8,
     119
    ],
    [
     8,
     8
    ]
   ],
   "neighbors": [
    "t1",
    "t7",
    "t6"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t1",
   "name": "Cistern Nine",
   "cx": 391,
   "cy": 62,
   "poly": [
    [
     525,
     8
    ],
    [
     420,
     175
    ],
    [
     259,
     125
    ],
    [
     253,
     8
    ],
    [
     525,
     8
    ]
   ],
   "neighbors": [
    "t2",
    "t7",
    "t0"
   ],
   "resource": "water",
   "resourceValue": 2
  },
  {
   "id": "t2",
   "name": "Highway Graveyard",
   "cx": 534,
   "cy": 152,
   "poly": [
    [
     614,
     222
    ],
    [
     443,
     222
    ],
    [
     420,
     175
    ],
    [
     525,
     8
    ],
    [
     581,
     8
    ],
    [
     647,
     178
    ],
    [
     614,
     222
    ]
   ],
   "neighbors": [
    "t9",
    "t8",
    "t7",
    "t1",
    "t3"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t3",
   "name": "Ash Flats",
   "cx": 713,
   "cy": 82,
   "poly": [
    [
     877,
     8
    ],
    [
     764,
     183
    ],
    [
     647,
     178
    ],
    [
     581,
     8
    ],
    [
     877,
     8
    ]
   ],
   "neighbors": [
    "t4",
    "t9",
    "t2"
   ],
   "resource": "fuel",
   "resourceValue": 1
  },
  {
   "id": "t4",
   "name": "The Silo Belt",
   "cx": 877,
   "cy": 188,
   "poly": [
    [
     764,
     183
    ],
    [
     877,
     8
    ],
    [
     966,
     8
    ],
    [
     1007,
     234
    ],
    [
     945,
     302
    ],
    [
     815,
     280
    ],
    [
     764,
     183
    ]
   ],
   "neighbors": [
    "t9",
    "t3",
    "t5",
    "t15",
    "t14"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t5",
   "name": "Glasslands",
   "cx": 1112,
   "cy": 146,
   "poly": [
    [
     1192,
     8
    ],
    [
     1192,
     275
    ],
    [
     1007,
     234
    ],
    [
     966,
     8
    ],
    [
     1192,
     8
    ]
   ],
   "neighbors": [
    "t15",
    "t4"
   ],
   "resource": "scrap",
   "resourceValue": 2
  },
  {
   "id": "t6",
   "name": "Chokepoint Pass",
   "cx": 87,
   "cy": 212,
   "poly": [
    [
     8,
     119
    ],
    [
     219,
     172
    ],
    [
     208,
     241
    ],
    [
     8,
     337
    ],
    [
     8,
     119
    ]
   ],
   "neighbors": [
    "t0",
    "t7",
    "t10"
   ],
   "resource": "fuel",
   "resourceValue": 2
  },
  {
   "id": "t7",
   "name": "The Drowned Mall",
   "cx": 332,
   "cy": 252,
   "poly": [
    [
     425,
     313
    ],
    [
     403,
     340
    ],
    [
     261,
     334
    ],
    [
     208,
     241
    ],
    [
     219,
     172
    ],
    [
     259,
     125
    ],
    [
     420,
     175
    ],
    [
     443,
     222
    ],
    [
     425,
     313
    ]
   ],
   "neighbors": [
    "t8",
    "t12",
    "t11",
    "t10",
    "t6",
    "t0",
    "t1",
    "t2"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t8",
   "name": "Pylon Ridge",
   "cx": 534,
   "cy": 293,
   "poly": [
    [
     621,
     312
    ],
    [
     590,
     366
    ],
    [
     425,
     313
    ],
    [
     443,
     222
    ],
    [
     614,
     222
    ],
    [
     621,
     312
    ]
   ],
   "neighbors": [
    "t9",
    "t13",
    "t12",
    "t7",
    "t2"
   ],
   "resource": "water",
   "resourceValue": 1
  },
  {
   "id": "t9",
   "name": "Salt Quarter",
   "cx": 705,
   "cy": 279,
   "poly": [
    [
     621,
     312
    ],
    [
     614,
     222
    ],
    [
     647,
     178
    ],
    [
     764,
     183
    ],
    [
     815,
     280
    ],
    [
     764,
     346
    ],
    [
     621,
     312
    ]
   ],
   "neighbors": [
    "t13",
    "t8",
    "t2",
    "t3",
    "t4",
    "t14"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t10",
   "name": "The Boneworks",
   "cx": 155,
   "cy": 354,
   "poly": [
    [
     261,
     334
    ],
    [
     220,
     437
    ],
    [
     8,
     451
    ],
    [
     8,
     337
    ],
    [
     208,
     241
    ],
    [
     261,
     334
    ]
   ],
   "neighbors": [
    "t7",
    "t11",
    "t16",
    "t6"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t11",
   "name": "Reactor Shadow",
   "cx": 325,
   "cy": 422,
   "poly": [
    [
     403,
     340
    ],
    [
     423,
     463
    ],
    [
     290,
     541
    ],
    [
     220,
     437
    ],
    [
     261,
     334
    ],
    [
     403,
     340
    ]
   ],
   "neighbors": [
    "t7",
    "t12",
    "t17",
    "t16",
    "t10"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t12",
   "name": "Old Terminal",
   "cx": 502,
   "cy": 393,
   "poly": [
    [
     590,
     366
    ],
    [
     597,
     457
    ],
    [
     542,
     525
    ],
    [
     423,
     463
    ],
    [
     403,
     340
    ],
    [
     425,
     313
    ],
    [
     590,
     366
    ]
   ],
   "neighbors": [
    "t8",
    "t13",
    "t18",
    "t17",
    "t11",
    "t7"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t13",
   "name": "Scrapper's Rise",
   "cx": 681,
   "cy": 379,
   "poly": [
    [
     621,
     312
    ],
    [
     764,
     346
    ],
    [
     758,
     456
    ],
    [
     757,
     457
    ],
    [
     597,
     457
    ],
    [
     590,
     366
    ],
    [
     621,
     312
    ]
   ],
   "neighbors": [
    "t8",
    "t9",
    "t14",
    "t19",
    "t18",
    "t12"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t14",
   "name": "The Dry Docks",
   "cx": 843,
   "cy": 387,
   "poly": [
    [
     764,
     346
    ],
    [
     815,
     280
    ],
    [
     945,
     302
    ],
    [
     958,
     406
    ],
    [
     897,
     468
    ],
    [
     758,
     456
    ],
    [
     764,
     346
    ]
   ],
   "neighbors": [
    "t13",
    "t9",
    "t4",
    "t15",
    "t20",
    "t19"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t15",
   "name": "Vulture Mesa",
   "cx": 1066,
   "cy": 359,
   "poly": [
    [
     945,
     302
    ],
    [
     1007,
     234
    ],
    [
     1192,
     275
    ],
    [
     1192,
     502
    ],
    [
     1154,
     509
    ],
    [
     958,
     406
    ],
    [
     945,
     302
    ]
   ],
   "neighbors": [
    "t14",
    "t4",
    "t5",
    "t25",
    "t20"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t16",
   "name": "The Undercroft",
   "cx": 167,
   "cy": 528,
   "poly": [
    [
     290,
     541
    ],
    [
     278,
     611
    ],
    [
     244,
     640
    ],
    [
     8,
     586
    ],
    [
     8,
     451
    ],
    [
     220,
     437
    ],
    [
     290,
     541
    ]
   ],
   "neighbors": [
    "t11",
    "t17",
    "t22",
    "t21",
    "t10"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t17",
   "name": "Fuel Line Seven",
   "cx": 411,
   "cy": 569,
   "poly": [
    [
     542,
     525
    ],
    [
     550,
     583
    ],
    [
     461,
     686
    ],
    [
     278,
     611
    ],
    [
     290,
     541
    ],
    [
     423,
     463
    ],
    [
     542,
     525
    ]
   ],
   "neighbors": [
    "t12",
    "t18",
    "t23",
    "t22",
    "t16",
    "t11"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t18",
   "name": "Widow's Span",
   "cx": 681,
   "cy": 535,
   "poly": [
    [
     597,
     457
    ],
    [
     757,
     457
    ],
    [
     753,
     635
    ],
    [
     717,
     671
    ],
    [
     550,
     583
    ],
    [
     542,
     525
    ],
    [
     597,
     457
    ]
   ],
   "neighbors": [
    "t12",
    "t13",
    "t19",
    "t24",
    "t23",
    "t17"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t19",
   "name": "The Cinder Rows",
   "cx": 829,
   "cy": 538,
   "poly": [
    [
     758,
     456
    ],
    [
     897,
     468
    ],
    [
     914,
     613
    ],
    [
     753,
     635
    ],
    [
     757,
     457
    ],
    [
     758,
     456
    ]
   ],
   "neighbors": [
    "t13",
    "t14",
    "t20",
    "t24",
    "t18"
   ],
   "resource": "scrap",
   "resourceValue": 1
  },
  {
   "id": "t20",
   "name": "Radio Hill",
   "cx": 980,
   "cy": 521,
   "poly": [
    [
     914,
     613
    ],
    [
     897,
     468
    ],
    [
     958,
     406
    ],
    [
     1154,
     509
    ],
    [
     986,
     662
    ],
    [
     914,
     613
    ]
   ],
   "neighbors": [
    "t24",
    "t19",
    "t14",
    "t15",
    "t25"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t21",
   "name": "The Sump",
   "cx": 126,
   "cy": 707,
   "poly": [
    [
     8,
     792
    ],
    [
     8,
     586
    ],
    [
     244,
     640
    ],
    [
     226,
     792
    ],
    [
     8,
     792
    ]
   ],
   "neighbors": [
    "t16",
    "t22"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t22",
   "name": "Quarantine Zone",
   "cx": 343,
   "cy": 734,
   "poly": [
    [
     226,
     792
    ],
    [
     244,
     640
    ],
    [
     278,
     611
    ],
    [
     461,
     686
    ],
    [
     468,
     792
    ],
    [
     226,
     792
    ]
   ],
   "neighbors": [
    "t21",
    "t16",
    "t17",
    "t23"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t23",
   "name": "Gallows Junction",
   "cx": 585,
   "cy": 718,
   "poly": [
    [
     550,
     583
    ],
    [
     717,
     671
    ],
    [
     722,
     792
    ],
    [
     468,
     792
    ],
    [
     461,
     686
    ],
    [
     550,
     583
    ]
   ],
   "neighbors": [
    "t17",
    "t18",
    "t24",
    "t22"
   ],
   "resource": "water",
   "resourceValue": 2
  },
  {
   "id": "t24",
   "name": "The Last Orchard",
   "cx": 853,
   "cy": 707,
   "poly": [
    [
     722,
     792
    ],
    [
     717,
     671
    ],
    [
     753,
     635
    ],
    [
     914,
     613
    ],
    [
     986,
     662
    ],
    [
     998,
     792
    ],
    [
     722,
     792
    ]
   ],
   "neighbors": [
    "t23",
    "t18",
    "t19",
    "t20",
    "t25"
   ],
   "resource": null,
   "resourceValue": 0
  },
  {
   "id": "t25",
   "name": "Static Fields",
   "cx": 1126,
   "cy": 681,
   "poly": [
    [
     1192,
     792
    ],
    [
     998,
     792
    ],
    [
     986,
     662
    ],
    [
     1154,
     509
    ],
    [
     1192,
     502
    ],
    [
     1192,
     792
    ]
   ],
   "neighbors": [
    "t24",
    "t20",
    "t15"
   ],
   "resource": "scrap",
   "resourceValue": 1
  }
 ],
 "startIds": [
  "t12",
  "t14",
  "t21",
  "t0",
  "t10",
  "t24",
  "t15",
  "t2"
 ]
};
