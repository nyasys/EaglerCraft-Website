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
    for(var i = 0; i < el.val().length; i++) {
        if (newVal.length >= 14) break;
        if (!el.val()[i].match(/[\s-]/))
            newVal += el.val()[i];
        if (newVal.length < 13 && (newVal.length + 1) % 5 == 0) {
            newVal += "-";
        }
    }
    el.val(newVal);
}

var countTo = function(el, val) {
    if (el.text().length != val.length) {
        el.text(val);
        el.css('width', el.width() + 'px').css('display', 'inline-block');
        return false;
    }
    var digits = el.text().split('');
    el.css('width', el.width() + 'px').css('display', 'inline-block');
    el.html("");
    var offset = new Array();
    var digitEles = new Array();
    for (i in digits) {
        var digit = $("<span></span>").text(digits[i]).appendTo(el);
        offset.push(digit.position().left);
        digitEles.push(digit);
    }
    for (i in digitEles) {
        digitEles[i].css({
            top: 0,
            left: offset[i] + "px",
            position: 'absolute'
        })
    }

    var newDigits = val.split('');
    for (i in newDigits) {
        if (newDigits[i] != digits[i]) {
            var newDigit = $('<span></span>').text(newDigits[i]).appendTo(el);
            newDigit.css({
                top: "-10px",
                left: offset[i] + "px",
                position: 'absolute'
            });
            newDigit.animate({
                top: '+=10',
                opacity: 1.0
            }, 200), function() {
                el.html(val)
            };
            digitEles[i].animate({
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
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
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
        for (i in tweets) {
            if (tweets[i].text.match("^@")) continue;
            if (count >= 4) break;
            count++;
            var tweet = $("<li></li>").addClass('tweet');
            $("<div></div>").addClass('message').text(tweets[i].text).appendTo(tweet);
            $("<span></span>").addClass('timestamp').text($.timeago(tweets[i].created_at)).appendTo(tweet);
            tweet.appendTo(list);
        }
        $('#twitter div').html("").append(list);
    });
}

var loadFacebook = function() {
    $('#facebook .fbarea').html('<iframe src="https://web.archive.org/web/20120308213509/https://www.facebook.com/plugins/likebox.php?href=http%3A%2F%2Fwww.facebook.com%2Fminecraft&amp;width=300&amp;colorscheme=dark&amp;connections=10&amp;stream=false&amp;header=false&amp;height=255" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:300px; height:255px;" allowTransparency="true"></iframe>');
}

var loadTumblr = function () {
    $.get('/feeds/tumblr', function (data) {
        var posts = JSON.parse(data).posts, list = $("<ul></ul>"), i;
        for (i in posts) {
            if (list.children(".tumblr").length >= 5) {
                break;
            }
            if (posts[i]['regular-title']) {
                var post = $("<li></li>").addClass('tumblr');
                $("<span></span>").addClass('title').text(posts[i]['regular-title']).appendTo(post);
                $("<div></div>").addClass('timestamp').text($.timeago(posts[i].date)).appendTo(post);
                post.appendTo(list);
            }
        }
        $('#tumblr div').html("").append(list);
    });
}

var loggedOut = function() {
    $('#userbox .logged-out').show();
    $('#userbox .logged-in').html('').hide();
}

var loggedIn = function(payload) {
    if (app.debug) {
        window.log(payload);
    }
    var user = payload.user;

    $('#userbox .logged-out').hide();
    $('#userbox .logged-in').html('Logged in as ' + user.name + ' | <a href="/logout" id="logout-link">Log out</a>').show();
    $('#logout-link').click(function(event) {
        event.preventDefault();
        $.ajax({
            url: "/session",
            type: "DELETE"
        });
        $.postMessage('logout', accountServiceAddress, $("#iframe iframe")[0].contentWindow);
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

    var mainclasses = $('#main').attr('class').split(' ');
    for(var i = 0; i < mainclasses.length; i++) {
        var mainclass = mainclasses[i];
        if (mainclass.match(/(path_|verb_)/)) {
            $('#main').removeClass(mainclass);
        }
    }
    $('#main').addClass("path_" + location.toString().replace(/[^0-9a-zA-Z]/g, ""));

    $('#menu > li').bind('mouseover', dropdownOpen);
    $('#menu > li').bind('mouseout', dropdownTimer);

    // Specific locations
    if (location == "/") {
        loadFacebook();
        loadTwitter();
        loadTumblr();
        if (typeof justLoggedIn != 'undefined' && justLoggedIn) {
            _gaq.push(['_trackEvent', 'Account', 'Login-completed', 'Minecraft']);
        }
        var statsTicker = window.setInterval(updateStats, 1000);
        
        $('#hidePocketPush').click(function(e) {
            setCookie("hidePocketPush", 1, 90);
            $('#pocket-splash').fadeOut(150);
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
            } else if (type == "m") {
                return match[1] * 60;
            } else if (type == "h") {
                return match[1] * 60 * 60;
            } else if (type == "d") {
                return match[1] * 60 * 60 * 24;
            }
        }
        $.fn.dataTableExt.oSort['duration-asc']  = function(x,y) {
            return ((durToTime(x) < durToTime(y)) ? -1 : ((durToTime(x) > durToTime(y)) ? 1 : 0));
        };

        $.fn.dataTableExt.oSort['duration-desc'] = function(x,y) {
            return ((durToTime(x) < durToTime(y)) ? 1 : ((durToTime(x) > durToTime(y)) ? -1 : 0));
        };
        $('#servers').dataTable({
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
    
        $('#redeemForm #code').keyup(function(event) {
            if($('#redeemForm #code').val().length != oldCodeLength) {
                formatCode($('#redeemForm #code'));
                oldCodeLength = $('#redeemForm #code').val().length;
            }
        });
    } else if (location.match(/\/verifyemail/)) {
        if (typeof justRegistered != 'undefined' && justRegistered) {
             _gaq.push(['_trackEvent', 'Account', 'Registration-completed','Minecraft']);
        }
    }
});


}