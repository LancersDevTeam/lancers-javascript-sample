/**
 * SEOフレンドリーな無限スクロール
 */
(function () {
  'use strict';
  // 事前に読み込む次ページのページ数
  const LOAD_PAGES = 1.5;
  // スクロール位置がページの下限からどのぐらい上にあったときそのページを閲覧中とするのかの設定値
  const BOTTOM_POSITION_RATE = 0.25;
  // ブラウザのウィンドウのどの高さを閲覧中の中心の高さとするのかの設定値
  const FORCUS_POSITION_RATE = 0.5; 
 
  var seoInfiniteScroll = {
    /**
     * スクロール位置に応じて、次のページを読み込む
     */
    init: function () {
      setPosition();
      loadPage();
    }
  };
 
  /**
   * 2ページ目以降にアクセスしたときは前のページも読み込まれるため、アクセスしたページにスクロール位置を調整する
   */
  function setPosition() {
    var pageArray = $(location).attr('search').match(/[?&]page=\d+/);
    if (pageArray) {
      var page = pageArray[0].replace(/[?&]page=/, '');
      if (page >= 2) {
        $(window).load(function(){
          setTimeout(function() {
            if ($(".item:last")[0]) {
              $(window).scrollTop($(".item:last").offset().top);
            }
          }, 300);
        });
      }
    }
  }
 
  /**
   * 前後のページを読み込み表示する
   *
   * 前のページの無限スクロールの仕組み
   * loadPrevPage()で前のページを読み込み、prevDataCacheに読み込んだデータを保持
   * showPrevPage()でprevDataCacheに保持しているデータを表示
   *
   * 読み込みと表示で処理を分け、タイミングをずらしている理由は以下。
   * 上にコンテンツが追加されるとユーザーがみている位置が下にずれてしまうためのを防ぐためにjsで位置を修正しており、
   * そのときに読み込みまで行うと処理に時間がかかってしまう、jsでの位置の調整がカクカクするため。
   * 
   * 次のページの無限スクロールの仕組み
   * loadNextPage()で次のページを読み込み表示
   */
  function loadPage() {
    var isLoading = false;
    var prevDataCache = false;
    var nextPageExist = true;
 
    $(window).scroll(function() {
      var infiniteScrollTopPosition = $(".item:first").offset().top;
      var itemHeight = $(".item:first").outerHeight();
      var scrollTopPosition = $(window).scrollTop();
      loadPrevPage();
      showPrevPage();
      loadNextPage();
      updateBrowserHistory();
 
      /**
       * 前のページを読み込んでprev_data_cacheに入れる
       */
      function loadPrevPage() {
        if (!prevDataCache && !isLoading) {
          // ユーザーに読込みの待ち時間を発生させないためにLOAD_PAGESページ分前で読み込みイベントを発火する
          // 読み込みする位置までスクロールされていたらtrue、そうでなかったらfalseを返す
          var isScrollPosionToLoad = infiniteScrollTopPosition + itemHeight * LOAD_PAGES >= scrollTopPosition;
          // 前のページのURLが存在していたらtrue、そうでなかったらfalseを返す
          var isExistPrevUrl = Boolean($(".item:first").attr('data-prev-url'));
          // 読み込み位置までスクロールされており、data-prev-urlに読み込むべきURLがあるときに読み込み処理を行う
          if (isScrollPosionToLoad && isExistPrevUrl) {
            isLoading = true;
            var loadUrl = $(".item:first").attr('data-prev-url') + '&type=part';
            $.ajax({
              type:'GET',
              url:loadUrl,
              dataType:'json',
              'success': function(data) {
                prevDataCache = data.data;
                setTimeout(function() {
                  isLoading = false;
                }, 200);
              },
              'error': function(data) {}
            });
          }
        }
      }
 
      /**
       * loadPrevPage()によってprev_data_cacheに入れた前のページのデータを表示する
       */
      function showPrevPage() {
        if (prevDataCache && !isLoading) {
          // ユーザーに読込みの待ち時間を発生させないために1ページ分前で表示イベントを発火する
          var isScrollPosionToShow = infiniteScrollTopPosition + itemHeight >= scrollTopPosition;
          if (isScrollPosionToShow) {
            isLoading = true;
            $(".item-container").prepend(prevDataCache);
            $(window).scrollTop($(window).scrollTop() + itemHeight);
            prevDataCache = false;
            setTimeout(function() {
              isLoading = false;
            }, 200);
          }
        }
      }
 
      /**
       * 次のページを読み込み表示する
       */
      function loadNextPage() {
        // 読み込み中でなく、読み込む次のページが存在しているか
        if (!isLoading && nextPageExist) {
          // ユーザーに読込みの待ち時間を発生させないために1ページ分前で読込みイベントを発火する
          var scrollPositionBottom = scrollTopPosition + $(window).height();
          var isScrollPosionToLoad = $(".item:last").offset().top - itemHeight <= scrollPositionBottom;
          if (isScrollPosionToLoad) {
            isLoading = true;
            $(".loading").show();
            var loadUrl = $(".item:last").attr('data-next-url') + '&type=part';
            $.ajax({
              type:'GET',
              url:loadUrl,
              dataType:'json',
              'success': function(data) {
                if (data.data) {
                  $(".item-container").append(data.data);
                  setTimeout(function() {
                    isLoading = false;
                    $(".loading").hide();
                  }, 200);
                } else {
                  nextPageExist = false;
                  isLoading = false;
                  $(".loading").hide();
                  $(".finished").show();
                }
              },
              'error': function(data) {}
            });
          }
        }
      }
      /**
       * 検索窓に表示されるURLを現在みているページのものにする
       */
      function updateBrowserHistory() {
        $(".item").each(function(index) {
          if (mostlyVisible(this) && $(this).attr("data-url") !== $(location).attr('pathname') + $(location).attr('search')) {
            history.pushState(null, null, $(this).attr("data-url"));
          }
        });
      }
 
      /**
       * 現在みているページであるかを返す
       * @return boolean
       */
      function mostlyVisible(element) {
        var scrollPosition = $(window).scrollTop();
        var windowHeight = $(window).height();
        var elementTop = $(element).offset().top;
        var elementHeight = $(element).height();
        var elementBottom = elementTop + elementHeight;
        // スクロール位置がページの下限から指定した高さ分だけ上にあるかチェック　&& 閲覧の中心の高さがページの上限よりも下にあることをチェック
        return ((elementBottom - elementHeight * BOTTOM_POSITION_RATE > scrollPosition) && (elementTop < (scrollPosition + windowHeight * FORCUS_POSITION_RATE)));
      }
    });
  }
 
  window.seoInfiniteScroll = function () {
    return Object.create(seoInfiniteScroll);
  };
})();
