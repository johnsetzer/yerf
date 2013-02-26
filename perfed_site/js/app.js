$(function () {
  yerf().start('feed.appInit');
  // Simulate appInit taking a while
  setTimeout(function () {
    yerf('feed.appInit').stop();
    onAppInit();
  }, 500);
});

var feedMode = 'feed';

function onAppInit () {
  
  fastSwitch();
  
  yerf().start('feed.counts').waterfall('api', 'render').start('api');
  // Simulate groupCountsApi taking a while
  setTimeout(function () {
    yerf('feed.counts.api').stop();
    renderGroupCounts();
  }, 100);

  yerf().start('feed.notifications').waterfall('api', 'render').start('api');
  // Simulate inboxApi taking a while
  setTimeout(function () {
    yerf('feed.notifications.api').stop();
    renderNotifications();
  }, 350);

  loadPartial();
}

function loadPartial() {
  yerf().start(feedMode + '.partial').waterfall('request', 'activites', 'files').start('request');
  // Simulate partial request taking a while
  setTimeout(function () {
    yerf(feedMode + '.partial.request').stop();
    partial();
  }, 650);
}

function renderFeedList() {
  yerf().start(feedMode + '.feed.render');
  $('.FeedList').html('');
  var msgCount = 10;
  for (var i = 1; i <= msgCount; i++) {
    // Create scope for feedNum
    (function () {
      var feedNum = i;
      setTimeout(function () {
        renderMessage();

        if (feedNum === msgCount) {
          yerf(feedMode + '.feed.render').stop();
        }
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
  yerf().start(feedMode + '.feed').waterfall('api', 'payloadProcess', 'render').start('api');
  // Simulate feedApi taking a while
  setTimeout(function () {
    yerf(feedMode + '.feed.api').stop();
    yerf().start(feedMode + '.feed.payloadProcess');
    // Simulate payloadProcess taking a while
    setTimeout(function () {
      yerf(feedMode + '.feed.payloadProcess').stop();
      renderFeedList();
    }, 10);
  }, 200);
}

$('#fastSwitch').click(function () {
  feedMode = 'fastSwitch';
  yerf().start('fastSwitch').waterfall('feed', 'partial');
  fastSwitch();
  loadPartial();
});

$('#subscribedSwitch').click(function () {
  feedMode = 'subscribedSwitch';
  yerf().start('subscribedSwitch').waterfall('feed', 'partial');
  yerf().start('subscribedSwitch.feed').waterfall('render');
  renderFeedList();
  loadPartial();
});

function renderGroupCounts () {
  yerf().start('feed.counts.render');
  setTimeout(function () {
    $('.GroupList span').each(function (e, f) {
      var groupCount = Math.floor(Math.random() * 10);
      $(f).html('(' + groupCount + ')');
    });
    yerf('feed.counts.render').stop();
  }, 100);
}

function renderNotifications () {
  yerf().start('feed.notifications.render');
  setTimeout(function () {
    $('#notificationCount').html('4, 7');
    yerf('feed.notifications.render').stop();
  }, 200);

}

function partial () {
  renderActivities();
  renderTrendingFiles();
}

function renderActivities () {
  yerf().start(feedMode + '.partial.activites');
  setTimeout(function () {
    var activityDiv = $('.ActivityList');
    var activityList = $('<ul>');

    for (var i = 1; i <= 10; i++) {
      activityList.append('<li>Activity ' + i + '</li>');
    }

    activityDiv.html('<strong>Activity List</strong>');
    activityDiv.append(activityList);
    yerf(feedMode + '.partial.activites').stop();
  }, 200);
}

function renderTrendingFiles () {
  yerf().start(feedMode + '.partial.files');
  setTimeout(function () {
    var fileDiv = $('.TrendingFiles');
    var fileList = $('<ul>');

    for (var i = 1; i <= 10; i++) {
      fileList.append('<li>File ' + i + '</li>');
    }

    fileDiv.html('<strong>Trending Files</strong>');
    fileDiv.append(fileList);
    yerf(feedMode + '.partial.files').stop();
  }, 100);
}