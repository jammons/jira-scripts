// ==UserScript==
// @name       Add Story Points to Kanban Board
// @namespace  http://use.i.E.your.homepage/
// @version    0.1
// @description  enter something useful
// @match      http://tampermonkey.net/index.php?version=3.7.13&ext=dhdg&updated=true
// @copyright  2012+, You
// ==/UserScript==

// see https://jira.atlassian.com/browse/GHS-6755
function processSPs() {
    try {
        // fieldId of field containing user story points
        var SP_FIELD = "customfield_10004";
        var restApiBaseUrl = document.location.protocol+"//"+document.location.host;
        if (GH.Ajax.CONTEXT_PATH && GH.Ajax.CONTEXT_PATH.length>0) {
            restApiBaseUrl += "/"+GH.Ajax.CONTEXT_PATH;
        }

        // function is perform a 'GET' REST call
        function getJson(restUrl, callback, callbackError) {
            return jQuery.ajax({
                type: "GET",
                url: restUrl,
                success: callback,
                dataType: "json",
                contentType: "application/json; charset=utf-8",
                error: callbackError    
            });
        }

        // function which displays the specified story points inside its own span inside the specified container
        function setSPSpanValue(jQContainers, sp) {
            jQuery.each(jQContainers, function() {
                jQContainer = jQuery(this);
                var spDiv = jQContainer.find(".sp-flag");
                if (spDiv.length===0) {
                    spDiv = jQuery("<span class='sp-flag' style='margin-left: 5px; font-weight: bold'></span>").appendTo(jQContainer);
                }
                spDiv.html("("+sp+" SP)");
            });
        }

        jQuery("#ghx-board-name").css("display", "inline");
        function processColumn(boardInfo, columnInfo) {
            var statusIds = columnInfo.statusIds;
            
            // collect all issue keys of the current column
            var issueKeys = _.map(boardInfo.issuesData.issues, function(issueData) {
                if (jQuery.inArray(String(issueData.statusId), statusIds)!==-1) {
                    return issueData.key;
                }
                return null;
            });
            issueKeys = _.without(issueKeys, null);
            
            searchIssues(issueKeys, columnInfo.id, 0, 0);
        }

        var grandTotalSP = 0;
        function searchIssues(issueKeys, dataId, startAt, totalSP) {
            var jQHeader = jQuery(".ghx-column-headers li[data-id="+dataId+"] h2");
            jQHeader.css("display", "inline");

            if (issueKeys.length==0) {
                setSPSpanValue(jQHeader, 0);
                return;
            }
            
            var url = restApiBaseUrl+"/rest/api/2/search?jql=key in ("+issueKeys+")&fields="+SP_FIELD+"&maxResults=500";
            getJson(url+"&startAt="+startAt, function(searchResult) {
                jQuery.each(searchResult.issues, function(i, issue) {
                if (issue.fields && issue.fields[SP_FIELD]) {
                        var sp = issue.fields[SP_FIELD];
                        setSPSpanValue(jQuery(".ghx-issue[data-issue-key='"+issue.key+"'] .ghx-key"), sp);
                        totalSP += sp;
                        totalSP = Math.round(totalSP*100)/100;
                    }
                });
                
                setSPSpanValue(jQHeader, totalSP);

                grandTotalSP += totalSP;
                grandTotalSP = Math.round(grandTotalSP*100)/100;
                var boardTitle = jQuery("#ghx-view-selector");
                setSPSpanValue(boardTitle, grandTotalSP);

                var callStartAt = searchResult.startAt||0;
                if (startAt+searchResult.issues.length < searchResult.total) {
                    searchIssues(issueKeys, dataId, startAt+searchResult.maxResults, totalSP);
                }
            });
        }

        
        var rapidViewId = GH.RapidBoard.State.data.rapidViewId;
        if (rapidViewId) {
            var url = restApiBaseUrl+GH.Ajax.REST_URL_BASE+"/xboard/work/allData/?rapidViewId="+rapidViewId;
            getJson(url, function(boardInfo) {
                var i;
                for (i=0; i<boardInfo.columnsData.columns.length; i++) {
                    var columnInfo = boardInfo.columnsData.columns[i];
                    processColumn(boardInfo, columnInfo);
                }
            });
        }
    }
    catch (e) {
        console.log("processSPs error occured", e);
    }
}

jQuery().ready(function() {
    AJS.$(GH).bind('workModeUIReady', function() {
        processSPs();
    });
});

