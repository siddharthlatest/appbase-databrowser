(function(){
angular
.module('AppbaseDashboard')
.controller('invite', InviteCtrl);

function InviteCtrl($routeParams, stringManipulation, $scope, session, $rootScope, $location, $timeout){
  $rootScope.db_loading = true;
  if($scope.devProfile = session.getProfile()) {
    Appbase.credentials("inviteafriend", "f1f5e9662a9bae3ce3d7f2b2b8869f4a");
   
    var userProfile = $scope.devProfile;
    var email = userProfile.email.replace('@','');
    var usersNS = Appbase.ns("users");
    var inviteNS = Appbase.ns("sentinvites");
    var userV = usersNS.v(email);
    var inviteLink = ['https://appbase.io/?utm_campaign=viral&utm_content=',btoa(userProfile.email),'&utm_medium=share_link&utm_source=appbase'].join('');
   
    $("#subject").val('You have been invited to try Appbase by ' + userProfile.email)
    $('#invite-link').val(inviteLink);
    $('#link').val(inviteLink);
    $('#from').val(userProfile.email);

    $('#invited-users').on('click','.resend',function(e){
      $('#email').val($(this).data('email'));
      $('#form-invite-friends').submit();
      e.preventDefault();
    });

    userV.commitData(function(previousData) {
      if(!previousData.invites) {
        newData = {
          invites : 0
        }
      } else {
        newData = previousData;
      }
      return newData;
    }, function(error, vref) {
      //do nothing
    });

    userV.on('edge_added', function onComplete(err, vref,eref) {
      console.log('edge added', vref.path());
      if (err) {
        //console.log(err);
      }
      else {
        vref.isValid(function(err,bool){
          if(bool) {
            vref.on('properties', function (err,ref,userSnap) {
              if (err) {
                //console.log(err);
              } else {
                if(!$('#'+eref.priority()).length) {    
                  $('#invited-users').append('<li id="'+eref.priority()+'"">'+ userSnap.properties().email +': <span class="pull-right resend-link"></span> <em class="status">'+userSnap.properties().status+'<em> <span class="pull-right resend-link"></span>');
                  if(userSnap.properties().status == 'invited') {
                    $('#'+eref.priority()+' > .resend-link').html('<a class="resend" href="#" data-email="'+userSnap.properties().email+'" >Resend Invitation</a>');
                  }
                } else {
                  $('#'+eref.priority()+' > .status').text(userSnap.properties().status);
                  if(userSnap.properties().status == 'registered') {
                    $('#'+eref.priority()+' > .resend-link').remove();
                  }
                }
              }
            });
          }
        });
       }
    });

    $('#form-invite-friends').on('submit', function(event) {
      //$('#final-text').val([$('#text').val(),'<br><br> <a href="',inviteLink,'">Click here to join Appbase now.</a> or open this link on your browser: ', inviteLink, '.'].join(''));
      $('#final-text').val($('#text').val());
      //send form data to server
      $.ajax({
        type: "POST",
        url: $(this).attr('action'),
        data: $( this ).serialize(),
        dataType: 'json',
        beforeSend: function(jqXHR,settings) {
          $('#ajax-loader').hide().removeClass('hide').slideDown('fast');
          $('#email-error').html('');
        },
        complete: function(){
          $('#ajax-loader').hide();
        },
        success: function(data, status) {
          if(data.accepted){
            data.accepted.forEach(function(element,index){
              vertex = [email,element.replace(/@/g,'')].join('');
              //create new invited vertex and edge it to user
              var inviteV = inviteNS.v(vertex);
              inviteData = {
                  status : 'invited',
                  email: element
              }

              inviteV.setData(inviteData,function(error,vref){
                userV.setEdge(vref.name(),inviteV);
                $('#email-sent').html(['<li>Invitation sent to: ',element,'</li>'].join(''));
              });
              
            });
          } else if (data.rejected) {
            data.accepted.forEach(function(element,index){
              $('#email-error').append(['<li>',element,'</li>'].join(''));
            });
          } else {
            if(data.error) {
              $('#email-error').html(['<li>',data.message,'</li>'].join(''));
            } else {
              $('#email-error').html('<li>An error has happened.</li>');  
            }
            
          }
        }
      });
      event.preventDefault();
    });
  } {
    $rootScope.db_loading = false;
  }
}

})();