var map;
var infowindow;
	  
function initMap() {
	var initPosition = {lat: 42.33800859999999, lng: -71.1251311};

	map = new google.maps.Map(document.getElementById('map'), {
		center: initPosition,
		zoom: 15
	});

	infowindow = new google.maps.InfoWindow();
	var service = new google.maps.places.PlacesService(map);
	service.nearbySearch({
		location: initPosition,
		radius: 500,
		type: ['Restaurant']
	}, callback);
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
	
	this.initCoordinates = ko.observable(data.initCoordinates);	
	this.searchString = ko.observable(data.searchString);
	this.searchRadius = ko.observable(data.searchRadius);
	
}


var ViewModel = function(){
	
	this.model = ko.observable(new Model({
		initCoordinates: {lat: 42.33800859999999, lng: -71.1251311},
		searchString: "Cafe",
		searchRadius: 100
	})) ;
	
	this.tests = function() {
		
		var bla = $('#searchString').val();
		this.searchString(bla);
		
		console.log(bla);
		
    }
	
	
	
}

ko.applyBindings(new ViewModel());


