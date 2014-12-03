(function(){
angular
.module('AppbaseDashboard')
.controller('billing', BillingCtrl);

function BillingCtrl($routeParams, stringManipulation, $scope, session, $rootScope, $location, $timeout){
  var stripeKey = 'pk_SdFKltkp5kyf3nih2EypYgFVOqIRv';//test key
  //var stripeKey = 'pk_XCCvCuWKPx07ODJUXqFr7K4cdHvAS'; //production key
  $rootScope.db_loading = true;
  if($scope.devProfile = session.getProfile()) {
    $.getScript("https://js.stripe.com/v2/");
    $.getScript("https://checkout.stripe.com/checkout.js",loaded);
    var userProfile = JSON.parse(localStorage.getItem('devProfile'));
    
    function loaded(){ 
      $.ajax({
        url:['https://transactions.appbase.io/getCustomer/',userProfile.email].join(''),
        type: 'get',
        success: function(data){
          //if user just signed up, show credit card stuff.
          if($location.search().plan && data.stripeId === null){
            $('.button-subscribe').filter(['[data-plan=',$location.search().plan,']'].join('')).trigger('click');
          }
          localStorage.setItem('customer',JSON.stringify(data));
          $('#plans button').filter(['[data-plan="',data.plan,'"]'].join(''))
            .html('Your Current Plan')
            .attr('disabled','disabled')
            .removeClass('btn-success')
            .addClass('btn-primary');

          if(data.stripeId != null && data.customer.subscription != null){
            $('#plans button').filter(['[data-plan != "',data.plan,'"]'].join(''))
              .html('Change Plan')
              .removeAttr('disabled')
              .addClass('btn-success')
              .removeClass('btn-primary');
            $('.button-subscribe').off('click');
            $('.button-subscribe').on('click',function(e){     
              $this = $(this);
              if(data.customer.subscriptions.data[0]){
                plan = $(this).data('plan');
                stripeId = data.stripeId; 
                subscriptionId = data.customer.subscriptions.data[0].id;
                $.ajax({
                  url:'https://transactions.appbase.io/changePlan',
                  type: 'post',
                  beforeSend: function(){
                    $this.html('Changing Plan...');
                  },
                  data: {stripeId:stripeId,subscriptionId:subscriptionId,plan:plan,email:userProfile.email},
                  success: function(){
                    if(typeof(ga) === 'function')
                      ga('send', 'event', { eventCategory: 'subscribe', eventAction: 'plan', eventLabel: plan});
                    loaded();
                  }
                });
              }
              e.preventDefault();
            });

            //build subscription info
            if(data.customer) {
              subscriptions = data.customer.subscriptions;
              if(subscriptions.data.length){
                var dateStart = new Date(subscriptions.data[0].start * 1000);
                var datePeriodStart = new Date(subscriptions.data[0].current_period_start * 1000);
                var datePeriodEnd = new Date(subscriptions.data[0].current_period_end * 1000);

                $('#my-subscription').removeClass('hide');
                $('#subscription-start').html(dateStart.toDateString());
                $('#period-start').html(datePeriodStart.toDateString());
                
                if(!subscriptions.data[0].cancel_at_period_end){
                  $('#period-end').html(datePeriodEnd.toDateString());
                } else {
                  $('#period-end').html(['<strong>',datePeriodEnd.toDateString(),'</strong> - The subscription will be canceled at this date.'].join(''));
                }
              }
            }
          }
        },
        complete: $timeout.bind($timeout, function(){
          $rootScope.db_loading = false;
        })
      });

      var plan;
      var $button;
      //Stripe.setPublishableKey('pk_SdFKltkp5kyf3nih2EypYgFVOqIRv');
      handler = StripeCheckout.configure({
        key: stripeKey,
        //image: '/square-image.png',
        token: function(token) {
          $.ajax({
            url:'https://transactions.appbase.io/subscribe',
            type: 'post',
            data: {token: token.id, email: token.email, plan: plan},
            beforeSend: function(){
              $button.html('Subscribing...');
            },
            success: function(data){
              if(typeof(ga) === 'function')
                ga('send', 'event', { eventCategory: 'subscribe', eventAction: 'plan', eventLabel: plan});
              loaded();
            }
          });
        }
      });

      $('#cancel-subscription').on('click',function(e){
        e.preventDefault();
        $this = $(this);
        var customer = JSON.parse(localStorage.getItem('customer'));
        stripeId = customer.stripeId; 
        subscriptionId = customer.customer.subscriptions.data[0].id;
        
        $.ajax({
          url:'https://transactions.appbase.io/cancelSubscription',
          type: 'post',
          beforeSend: function(){
            $this.html('Canceling Subscription...');
          },
          data: {stripeId:stripeId,subscriptionId:subscriptionId,email:userProfile.email},
          success: function(data){
            if(typeof(ga) === 'function')
              ga('send', 'event', { eventCategory: 'subscribe', eventAction: 'cancel', eventLabel: customer.plan});
            $('#plans button')
              .html('Subscribe')
              .removeClass('btn-success')
              .addClass('btn-primary')
              .removeAttr('disabled');
            $this.html('Cancel Subscription');
            loaded();
          }
        });
      });

      $('.button-subscribe').on('click',function(e){
        $button = $(this);
        handler.open({
          name: 'Appbase.io',
          description: [$button.data('text'),' - Subscription'].join(''),
          image: '/developer/images/appbase.png',
          panelLabel : 'Subscribe now ({{amount}})',
          amount: $(this).data('amount'),
          allowRememberMe: false,
          email: userProfile.email,
        });

        plan = $(this).data('plan');

        e.preventDefault();
      });

    } 
  } else {
      $rootScope.db_loading = false;
  }
}

})();