(function(){
angular
.module('AppbaseDashboard')
.controller('billing', BillingCtrl);

function BillingCtrl($routeParams, stringManipulation, $scope, session, $rootScope, $location, $timeout, $document){
  //var stripeKey = 'pk_SdFKltkp5kyf3nih2EypYgFVOqIRv';//test key
  var stripeKey = 'pk_XCCvCuWKPx07ODJUXqFr7K4cdHvAS'; //production key
  $rootScope.db_loading = true;
  if($scope.devProfile = session.getProfile()) {
    $('body').append($('<div>').load('/developer/html/dialog-payment.html'));
    $.getScript("https://js.stripe.com/v2/",loaded);
    

    var userProfile = JSON.parse(localStorage.getItem('devProfile'));
    var plan;
    var $button;
  
    function loaded(){ 
      Stripe.setPublishableKey(stripeKey);  

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

          if(data.customer) {
            if(data.stripeId != null && data.customer.subscription != null){
              $('#plans button').filter(['[data-plan != "',data.plan,'"]'].join(''))
                .html('Change Plan')
                .removeAttr('disabled')
                .addClass('btn-success')
                .removeClass('btn-primary');
              
              $('.button-subscribe').off('click');
              
              $('.button-subscribe').on('click',function(e){
                $this = $(this);
                var a = new BootstrapDialog({
                    title: 'Change plan',
                    message: 'Are you sure you want to change your plan to '+ $(this).data('text')+'?',
                    closable: false,
                    cssClass: 'confirm-del',
                    buttons: [{
                        label: 'No',
                        cssClass: 'btn-no',
                        action: function(dialog) {
                            dialog.close();
                        }
                    }, {
                        label: 'Yes',
                        cssClass: 'btn-yes',
                        action: function(dialog) {
                          if(data.customer.subscriptions.data[0]){
                            plan = $this.data('plan');
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
                                $('#cancel-subscription').prop('disabled', false);
                              }
                            });
                          }
                          dialog.close();
                        }
                    }]
                }).open();     
                
                
                e.preventDefault();
              });

              //build subscription info
            
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
                  $('#cancel-subscription').prop('disabled', true);
                  $('#period-end').html(['<strong>',datePeriodEnd.toDateString(),'</strong> - The subscription will be canceled at this date. <br><strong>You can still change your plan before billing cycle is over.</strong>'].join(''));
                }
              }
            }
          } else {
            $('.button-subscribe').on('click',function(e){
              $('#payment_modal').modal();
              if(sessionStorage.getItem('discount')){
                $('#payment_modal #coupon').val('PHUNT30');
              }
              $button = $(this);
              plan = $(this).data('plan');
              $('#modal-plan').html($(this).data('text'));
              $('#email').val(userProfile.email);
              $('#modal-price').html(['$',(parseFloat($(this).data('amount'))/100).toFixed(2)].join(''));
              e.preventDefault();
            });
          }
        },
        complete: $timeout.bind($timeout, function(){
          $rootScope.db_loading = false;
        })
      });
      
      $('#cancel-subscription').on('click',function(e){
        e.preventDefault();
        $this = $(this);

        var a = new BootstrapDialog({
            title: 'Change plan',
            message: 'Are you sure you want to cancel your subscription?',
            closable: false,
            cssClass: 'confirm-del',
            buttons: [{
                label: 'No',
                cssClass: 'btn-no',
                action: function(dialog) {
                    dialog.close();
                }
            }, {
                label: 'Yes',
                cssClass: 'btn-yes',
                action: function(dialog) {
                  var customer = JSON.parse(localStorage.getItem('customer'));
                  var stripeId = customer.stripeId; 
                  var subscriptionId = customer.customer.subscriptions.data[0].id;
                  
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
                  dialog.close();
                }
            }]
        }).open();  
        
      });

      $('body').on('submit','#payment-form',function(event) {
        var $form = $(this);

        // Disable the submit button to prevent repeated clicks
        $form.find('button').prop('disabled', true);

        Stripe.card.createToken($form, stripeResponseHandler);

        // Prevent the form from submitting with the default action
        event.preventDefault();
      });

      function stripeResponseHandler(status, response) {
        var $form = $('#payment-form');
        if (response.error) {
          // Show the errors on the form
          $form.find('.payment-errors').text(response.error.message);
          $form.find('button').prop('disabled', false);
        } else {
          var coupon = $('#coupon').val();
          // response contains id and card, which contains additional card details
          var token = response.id;
        
          $.ajax({
            url:'https://transactions.appbase.io/subscribe',
            type: 'post',
            data: {token: token, email: userProfile.email, plan: plan, coupon: coupon},
            beforeSend: function(){
              $button.html('Subscribing...');
            },
            success: function(data){
              $('#payment_modal').modal('hide');
              if(typeof(ga) === 'function')
                ga('send', 'event', { eventCategory: 'subscribe', eventAction: 'plan', eventLabel: plan});
              loaded();
              $form.find('button').prop('disabled', false);
            },
            error: function(jqXHR,data,errorThrown){
              $form.find('button').prop('disabled', false);
              $form.find('.payment-errors').text(jqXHR.responseText);
              $button.html('Subscribe');
            }
          });
          
        }
      };
    } 
  } else {
      $rootScope.db_loading = false;
  }
}

})();