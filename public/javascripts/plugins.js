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

window.log = function(){
  log.history = log.history || [];
  log.history.push(arguments);
  arguments.callee = arguments.callee.caller;
  if(this.console) console.log( Array.prototype.slice.call(arguments) );
};
(function(b){function c(){}for(var d="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),a;a=d.pop();)b[a]=b[a]||c})(window.console=window.console||{});

$.extend({URLEncode:function(c){var o='';var input=0;c=c.toString();var r=/(^[a-zA-Z0-9_.]*)/;
  while(input<c.length){var limit=r.exec(c.substr(input));
    if(limit!=null && limit.length>1 && limit[1]!=''){o+=limit[1];input+=limit[1].length;
    }else{if(c[input]==' ')o+='+';else{var d=c.charCodeAt(input);var h=d.toString(16);
    o+='%'+(h.length<2?'0':'')+h.toUpperCase();}input++;}}return o;},
URLDecode:function(s){var o=s;var binVal,t;var r=/(%[^%]{2})/;
  while((limit=r.exec(o))!=null && limit.length>1 && limit[1]!=''){b=parseInt(limit[1].substr(1),16);
  t=String.fromCharCode(b);o=o.replace(limit[1],t);}return o;}
});

function setCookie(c_name,value,exdays){
    var exdate=new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
    document.cookie=c_name + "=" + c_value;
}
function getCookie(c_name){
    var index,input,output,ARRcookies=document.cookie.split(";");
    for (index=0;index<ARRcookies.length;index++){
        input=ARRcookies[index].substr(0,ARRcookies[index].indexOf("="));
        output=ARRcookies[index].substr(ARRcookies[index].indexOf("=")+1);
        input=input.replace(/^\s+|\s+$/g,"");
        if (input==c_name){
            return unescape(output);
        }
    }
    return null;
}

}
