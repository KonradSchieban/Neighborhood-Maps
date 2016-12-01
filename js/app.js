var map;
var infowindow;  
	  
function initMap(positionInput, radiusInput, nearbySearchTypeInput) {
	
	if(!positionInput){
		positionInput = {lat: 42.33800859999999, lng: -71.1251311};
	}
	if(!radiusInput){
		radiusInput = 500;
	}
	if(!nearbySearchTypeInput){
		nearbySearchTypeInput = 'Restaurant';
	}

	map = new google.maps.Map(document.getElementById('map'), {
		center: positionInput,
		zoom: 15
	});

	infowindow = new google.maps.InfoWindow();
	var service = new google.maps.places.PlacesService(map);
	service.nearbySearch({
		location: positionInput,
		radius: radiusInput,
		type: [nearbySearchTypeInput]
	}, callback);
	console.log(nearbySearchTypeInput);
}

function callback(results, status) {
	if (status === google.maps.places.PlacesServiceStatus.OK) {
		for (var i = 0; i < results.length; i++) {
			createMarker(results[i]);
		}
	}
}

function createMarker(place) {
	var placeLoc = place.geometry.location;
	var marker = new google.maps.Marker({
		map: map,
		position: place.geometry.location,
		draggable: true,
		animation: google.maps.Animation.DROP
	});
	
	marker.addListener('click', toggleBounce);
	
	google.maps.event.addListener(marker, 'click', function() {
		infowindow.setContent(place.name);
		infowindow.open(map, this);
	});
	
	function toggleBounce() {
		if (marker.getAnimation() !== null) {
			marker.setAnimation(null);
		} else {
			marker.setAnimation(google.maps.Animation.BOUNCE);
		}
	}
}


var Model = function(data){
	
	this.coordinates = ko.observable(data.coordinates);	
	this.searchString = ko.observable(data.searchString);
	this.searchRadius = ko.observable(data.searchRadius);
	
}


var ViewModel = function(){
	
	this.model = ko.observable(new Model({
		coordinates: {lat: 42.33800859999999, lng: -71.1251311},
		searchString: "Cafe",
		searchRadius: 100
	})) ;
	
	this.search = function() {
		
		var inputSearchStrRaw = $('#searchLocation').val();
		inputSearchStrRaw.replace(/ /g, "+");
		this.searchString(inputSearchStrRaw);
		
		var inputRadiusStrRaw = $('#searchRadius').val();
		this.searchRadius(inputRadiusStrRaw);
		
		var inputStringStrRaw = $('#searchString').val();
		this.searchString(inputStringStrRaw);
		
		var mapsGetResponse = $.ajax({
			url: 'http://maps.google.com/maps/api/geocode/json?address=' + inputSearchStrRaw,
			success: function (result) {
				if (result.isOk == false) alert(result.message);
			},
			async: false
		});
		
		this.coordinates(mapsGetResponse.responseJSON.results[0].geometry.location);
		
		initMap(this.coordinates(), this.searchRadius(), this.searchString());
		
    }
	
}

ko.applyBindings(new ViewModel());


