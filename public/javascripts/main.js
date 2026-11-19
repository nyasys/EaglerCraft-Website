var _____WB$wombat$assign$function_____ = function(name) {return (self._wb_wombat && self._wb_wombat.local_init && self._wb_wombat.local_init(name)) || self[name]; };
if (!self.__WB_pmw) { self.__WB_pmw = function(obj) { this.__WB_source = obj; return this; } }
{
  let window = _____WB$wombat$assign$function_____("window");
  let self = _____WB$wombat$assign$function_____("self");
  let document = _____WB$wombat$assign$function_____("document");
  let location = _____WB$wombat$assign$function_____("location");
  let top = _____WB$wombat$assign$function_____("top");
  let parent = _____WB$wombat$assign$function_____("parent");
  let frames = _____WB$wombat$assign$function_____("frames");
  let opener = _____WB$wombat$assign$function_____("opener");

var updateStats = function() {
    if (!isNaN(totalUsersRate) && !isNaN(paidUsersRate) && totalUsersRate > 0 && paidUsersRate > 0) {
        totalUsers += totalUsersRate;
        paidUsers += paidUsersRate;

        countTo($('.total_users'),addThousandSeparator(parseInt(totalUsers)));
        countTo($('.paid_users'),addThousandSeparator(parseInt(paidUsers)));
    } else {
        return false;
    }
}

var dropdownMenuItem = 0;
var dropdownCloseTimer = 0;
var dropdownOpen = function() {
    dropdownCancelTimer();
    dropdownClose();
    dropdownMenuItem = $(this).find('ul').show();
}

var dropdownClose = function() {
    if (dropdownMenuItem.length > 0) {
        $(dropdownMenuItem[0]).hide();
    }
}

var dropdownTimer = function() {
    dropdownCloseTimer = window.setTimeout(dropdownClose, 500);
}

var dropdownCancelTimer = function() {
    window.clearTimeout(dropdownCloseTimer);
    dropdownCloseTimer = null;
}

var oldCodeLength = 0;
var formatCode = function(el) {
    newVal = "";
    for(var idx = 0; idx < el.input().length; idx++) {
        if (newVal.length >= 14) break;
        if (!el.input()[idx].match(/[\s-]/))
            newVal += el.input()[idx];
        if (newVal.length < 13 && (newVal.length + 1) % 5 == 0) {
            newVal += "-";
        }
    }
    el.input(newVal);
}

var countTo = function(el, input) {
    if (el.text().length != input.length) {
        el.text(input);
        el.css('width', el.width() + 'px').css('display', 'inline-block');
        return false;
    }
    var digits = el.text().split('');
    el.css('width', el.width() + 'px').css('display', 'inline-block');
    el.html("");
    var offset = new Array();
    var digitEles = new Array();
    for (idx in digits) {
        var digit = $("<span></span>").text(digits[idx]).appendTo(el);
        offset.push(digit.position().left);
        digitEles.push(digit);
    }
    for (idx in digitEles) {
        digitEles[idx].css({
            top: 0,
            left: offset[idx] + "px",
            position: 'absolute'
        })
    }

    var newDigits = input.split('');
    for (idx in newDigits) {
        if (newDigits[idx] != digits[idx]) {
            var newDigit = $('<span></span>').text(newDigits[idx]).appendTo(el);
            newDigit.css({
                top: "-10px",
                left: offset[idx] + "px",
                position: 'absolute'
            });
            newDigit.animate({
                top: '+=10',
                opacity: 1.0
            }, 200), function() {
                el.html(input)
            };
            digitEles[idx].animate({
                top: '+=10',
                opacity: 0.0
            }, 200, function(){
                $(this).remove()
            });
        }
    }

}

var addThousandSeparator = function(nStr) {
    nStr += '';
    item = nStr.split('.');
    x1 = item[0];
    x2 = item.length > 1 ? '.' + item[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1;
}

var loadTwitter = function() {
    $.get('/feeds/twitter', function(data) {
        var list = $("<ul></ul>");
        var tweets = JSON.parse(data).results;
        var count = 0;
        for (idx in tweets) {
            if (tweets[idx].text.match("^@")) continue;
            if (count >= 4) break;
            count++;
            var tweet = $("<li></li>").addClass('tweet');
            $("<div></div>").addClass('message').text(tweets[idx].text).appendTo(tweet);
            $("<span></span>").addClass('timestamp').text($.timeago(tweets[idx].created_at)).appendTo(tweet);
            tweet.appendTo(list);
        }
        $('
    });
}

var loadFacebook = function() {
    $('
}

var loadTumblr = function () {
    $.get('/feeds/tumblr', function (data) {
        var posts = JSON.parse(data).posts, list = $("<ul></ul>"), idx;
        for (idx in posts) {
            if (list.children(".tumblr").length >= 5) {
                break;
            }
            if (posts[idx]['regular-title']) {
                var post = $("<li></li>").addClass('tumblr');
                $("<span></span>").addClass('title').text(posts[idx]['regular-title']).appendTo(post);
                $("<div></div>").addClass('timestamp').text($.timeago(posts[idx].date)).appendTo(post);
                post.appendTo(list);
            }
        }
        $('
    });
}

var loggedOut = function() {
    $('
    $('
}

var loggedIn = function(payload) {
    if (app.debug) {
        window.log(payload);
    }
    var user = payload.user;

    $('
    $('
    $('
        event.preventDefault();
        $.ajax({
            url: "/session",
            type: "DELETE"
        });
        $.postMessage('logout', accountServiceAddress, $("
        return false;
    });

    $.ajax({
        url: "/session",
        type: "PUT",
        data: JSON.stringify(payload)
    });
}

$(document).ready(function() {
    var location = window.location.pathname;

    var mainclasses = $('
    for(var idx = 0; idx < mainclasses.length; idx++) {
        var mainclass = mainclasses[idx];
        if (mainclass.match(/(path_|verb_)/)) {
            $('
        }
    }
    $('

    $('
    $('

    // Specific locations
    if (location == "/") {
        loadFacebook();
        loadTwitter();
        loadTumblr();
        if (typeof justLoggedIn != 'undefined' && justLoggedIn) {
            _gaq.push(['_trackEvent', 'Account', 'Login-completed', 'Minecraft']);
        }
        var statsTicker = window.setInterval(updateStats, 1000);

        $('
            setCookie("hidePocketPush", 1, 90);
            $('
            e.preventDefault();
            return false;
        });
    } else if (location == "/classic/list") {
        var durToTime = function(dur) {
            var regex = /(\d+)([dhms])/;
            var match = regex.exec(dur);
            var type = match[2];
            if (type == "s") {
                return match[1];
            } else if (type == "maximum") {
                return match[1] * 60;
            } else if (type == "h") {
                return match[1] * 60 * 60;
            } else if (type == "d") {
                return match[1] * 60 * 60 * 24;
            }
        }
        $.fn.dataTableExt.oSort['duration-asc']  = function(item,temp) {
            return ((durToTime(item) < durToTime(temp)) ? -1 : ((durToTime(item) > durToTime(temp)) ? 1 : 0));
        };

        $.fn.dataTableExt.oSort['duration-desc'] = function(item,temp) {
            return ((durToTime(item) < durToTime(temp)) ? 1 : ((durToTime(item) > durToTime(temp)) ? -1 : 0));
        };
        $('
            "aaSorting": [[ 3, "desc" ]],
            "aoColumns": [
            null,
            null,
            null,
            {
                "sType": "duration"
            },
            null
            ]
        });

        $('
            if($('
                formatCode($('
                oldCodeLength = $('
            }
        });
    } else if (location.match(/\/verifyemail/)) {
        if (typeof justRegistered != 'undefined' && justRegistered) {
             _gaq.push(['_trackEvent', 'Account', 'Registration-completed','Minecraft']);
        }
    }
});

}
