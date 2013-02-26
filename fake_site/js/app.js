$(function () {
  // Simulate appInit taking a while
  setTimeout(function () {
    onAppInit();
  }, 500);
});

var feedMode = 'feed';

function onAppInit () {
  
  fastSwitch();
  
  // Simulate groupCountsApi taking a while
  setTimeout(function () {
    renderGroupCounts();
  }, 100);

  // Simulate inboxApi taking a while
  setTimeout(function () {
    renderNotifications();
  }, 350);

  loadPartial();
}

function loadPartial() {
  // Simulate partial request taking a while
  setTimeout(function () {
    partial();
  }, 650);
}

function renderFeedList() {
  $('.FeedList').html('');
  var msgCount = 10;
  for (var i = 1; i <= msgCount; i++) {
    // Create scope for feedNum
    (function () {
      var feedNum = i;
      setTimeout(function () {
        renderMessage();
      }, 50 * 1);
    })();
  }
}

var MESSAGE_HTML = '<div class="Message">\
  <div class="From">John Says</div>\
  <div class="Comment">This is a fake message.</div>\
</div>'

function renderMessage () {
  $('.FeedList').append(MESSAGE_HTML);
}

function fastSwitch () {
  // Simulate feedApi taking a while
  setTimeout(function () {
    // Simulate payloadProcess taking a while
    setTimeout(function () {
      renderFeedList();
    }, 10);
  }, 200);
}

$('#fastSwitch').click(function () {
  feedMode = 'fastSwitch';
  fastSwitch();
  loadPartial();
});

$('#subscribedSwitch').click(function () {
  feedMode = 'subscribedSwitch';
  renderFeedList();
  loadPartial();
});

function renderGroupCounts () {
  setTimeout(function () {
    $('.GroupList span').each(function (e, f) {
      var groupCount = Math.floor(Math.random() * 10);
      $(f).html('(' + groupCount + ')');
    });
  }, 100);
}

function renderNotifications () {
  setTimeout(function () {
    $('#notificationCount').html('4, 7');
  }, 200);
}

function partial () {
  renderActivities();
  renderTrendingFiles();
}

function renderActivities () {
  setTimeout(function () {
    var activityDiv = $('.ActivityList');
    var activityList = $('<ul>');

    for (var i = 1; i <= 10; i++) {
      activityList.append('<li>Activity ' + i + '</li>');
    }

    activityDiv.html('<strong>Activity List</strong>');
    activityDiv.append(activityList);
  }, 200);
}

function renderTrendingFiles () {
  setTimeout(function () {
    var fileDiv = $('.TrendingFiles');
    var fileList = $('<ul>');

    for (var i = 1; i <= 10; i++) {
      fileList.append('<li>File ' + i + '</li>');
    }

    fileDiv.html('<strong>Trending Files</strong>');
    fileDiv.append(fileList);
  }, 100);
}