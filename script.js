var API = "http://127.0.0.1:5000";

// ---------- dark look for map tiles (no CSS file change needed) ----------
var dark_style = document.createElement("style");
dark_style.innerHTML = ".dark-tiles { filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9); }";
document.head.appendChild(dark_style);

// ---------- map and base maps ----------
var map = L.map("map").setView([33.907, 73.39], 12);

var street = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
});

// Dark = OpenStreetMap tiles turned dark (free, no API key)
var dark = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  className: "dark-tiles",
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

var satellite = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: 19, attribution: "Tiles &copy; Esri" });

L.control.layers({ "Dark": dark, "Street": street, "Satellite": satellite }).addTo(map);
L.control.scale().addTo(map);

// ---------- variables ----------
var colors = {
  hotel: "#ff6b6b",
  guest_house: "#00b4d8",
  hostel: "#80ed99",
  motel: "#ffbe0b",
  resort: "#c77dff"
};

var all_hotels = [];                          // all hotels from the database
var hotel_layer = L.layerGroup().addTo(map);  // pins on the map
var chosen_type = "all";                      // chip filter
var add_mode = false;                         // true when adding a hotel
var temp_marker = null;                       // temporary pin
var new_lat = null;
var new_lon = null;
var first_time = true;

// make text safe for HTML
function safe(text) {
  if (text === null || text === undefined) { return ""; }
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// small message at the bottom
function say(text) {
  var box = document.getElementById("msg");
  box.innerText = text;
  box.style.display = "block";
  setTimeout(function () { box.style.display = "none"; }, 3000);
}

// make a glowing pin
function make_pin(color) {
  return L.divIcon({
    className: "pin-box",
    html: '<span class="pin" style="background:' + color + '; color:' + color + '"></span>',
    iconSize: [20, 20]
  });
}

// ---------- get hotels from API ----------
function load_hotels() {
  fetch(API + "/hotels")
    .then(function (answer) { return answer.json(); })
    .then(function (data) {
      all_hotels = data;
      document.getElementById("total_num").innerText = data.length;
      make_chips();
      show_hotels();

      if (first_time && data.length > 0) {
        var points = data.map(function (h) { return [h.lat, h.lon]; });
        map.fitBounds(points, { padding: [40, 40] });
        first_time = false;
      }
    })
    .catch(function () { say("API is not running!"); });
}

// ---------- filter chips ----------
function make_chips() {
  var box = document.getElementById("chips");
  var text = '<span class="chip ' + (chosen_type == "all" ? "active" : "") +
             '" onclick="pick_type(\'all\')">all (' + all_hotels.length + ')</span>';

  for (var type in colors) {
    var total = all_hotels.filter(function (h) { return h.type == type; }).length;
    text += '<span class="chip ' + (chosen_type == type ? "active" : "") +
            '" onclick="pick_type(\'' + type + '\')">' + type + ' (' + total + ')</span>';
  }
  box.innerHTML = text;
}

function pick_type(type) {
  chosen_type = type;
  make_chips();
  show_hotels();
}

// ---------- show hotels on map and in list ----------
function show_hotels() {
  hotel_layer.clearLayers();
  var list_box = document.getElementById("list");
  list_box.innerHTML = "";
  var word = document.getElementById("search").value.toLowerCase();
  var shown = 0;

  all_hotels.forEach(function (hotel) {
    // filter by type and search word
    if (chosen_type != "all" && hotel.type != chosen_type) { return; }
    if (word && (hotel.name || "").toLowerCase().indexOf(word) == -1) { return; }

    var color = colors[hotel.type] || "#cccccc";

    // pin on the map
    var pin = L.marker([hotel.lat, hotel.lon], { icon: make_pin(color) }).addTo(hotel_layer);

    // pop-up
    pin.bindPopup(
      '<div class="pop"><h3>' + safe(hotel.name) + '</h3>' +
      '<p><b>Type:</b> ' + safe(hotel.type) + '</p>' +
      '<p><b>Phone:</b> ' + (safe(hotel.phone) || "Not available") + '</p>' +
      '<p><b>Website:</b> ' + (safe(hotel.website) || "Not available") + '</p>' +
      '<p><b>Lat, Lon:</b> ' + hotel.lat.toFixed(5) + ', ' + hotel.lon.toFixed(5) + '</p></div>',
      { className: "my-popup" }
    );

    // item in the side list
    var item = document.createElement("div");
    item.className = "item";
    item.innerHTML = '<span class="dot" style="background:' + color + '"></span><b>' +
                     safe(hotel.name) + '</b><br><small>' + safe(hotel.type) + '</small>';
    item.onclick = function () {
      map.flyTo([hotel.lat, hotel.lon], 16);
      pin.openPopup();
    };
    list_box.appendChild(item);
    shown = shown + 1;
  });

  document.getElementById("shown_num").innerText = shown;
}

// ---------- add a new hotel ----------
function start_add() {
  add_mode = true;
  document.getElementById("map").style.cursor = "crosshair";
  say("Click on the map where the hotel is");
}

map.on("click", function (e) {
  if (!add_mode) { return; }
  new_lat = e.latlng.lat;
  new_lon = e.latlng.lng;

  if (temp_marker) { map.removeLayer(temp_marker); }
  temp_marker = L.marker([new_lat, new_lon], { icon: make_pin("#f5b942") }).addTo(map);

  document.getElementById("f_place").value = new_lat.toFixed(5) + ", " + new_lon.toFixed(5);
  document.getElementById("form_box").style.display = "flex";
});

function close_form() {
  document.getElementById("form_box").style.display = "none";
  document.getElementById("map").style.cursor = "";
  if (temp_marker) { map.removeLayer(temp_marker); temp_marker = null; }
  add_mode = false;
  document.getElementById("f_name").value = "";
  document.getElementById("f_phone").value = "";
  document.getElementById("f_website").value = "";
}

function save_hotel() {
  var new_hotel = {
    name: document.getElementById("f_name").value.trim(),
    type: document.getElementById("f_type").value,
    phone: document.getElementById("f_phone").value.trim(),
    website: document.getElementById("f_website").value.trim(),
    lat: new_lat,
    lon: new_lon
  };

  if (new_hotel.name == "") {
    alert("Please write the hotel name");
    return;
  }

  fetch(API + "/add_hotel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(new_hotel)
  })
    .then(function (answer) { return answer.json(); })
    .then(function (result) {
      if (result.error) { alert(result.error); return; }
      close_form();
      load_hotels();
      say("Hotel saved in PostGIS");
    })
    .catch(function () { say("Could not save. Is the API running?"); });
}

// ---------- legend ----------
var legend = L.control({ position: "bottomright" });
legend.onAdd = function () {
  var box = L.DomUtil.create("div", "legend");
  box.innerHTML = "<b>Legend</b><br>";
  for (var type in colors) {
    box.innerHTML += '<span class="dot" style="background:' + colors[type] + '"></span>' + type + "<br>";
  }
  return box;
};
legend.addTo(map);

// start
load_hotels();