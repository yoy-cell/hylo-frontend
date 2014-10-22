angular.module("hylo.createCommunity", [])
  .factory("CreateCommunityService", ['$timeout', '$analytics', function($timeout, $analytics) {
      var pickBanner = function pickBanner(imageModel, width, height) {
        // This will pick a file and store the original file in the 'orig/' subfolder, then convert it to a 200x200 image and store
        // that into the 'thumb/' folder with the same key.
        state.loadingBanner = true;

        var convertSettings = {
          width: 1600,
          format: 'jpg',
          fit: 'max',
          rotate: "exif"
        };

        filepicker.pickAndStore({
          mimetype: "image/*",
          multiple: false,
          services: ['COMPUTER', 'FACEBOOK', 'WEBCAM', 'GOOGLE_DRIVE', 'DROPBOX', 'INSTAGRAM', 'FLICKR', 'URL'],
          folders: false
        }, {
          location: "S3",
          path: 'orig/',
          access: 'public'
        }, function (InkBlobs) {
          $.each(InkBlobs, function(index, inkBlob) { // Convert the newly uploaded image to a thumbnail
            filepicker.convert(inkBlob, convertSettings, {
                  location: 'S3',
                  path: 'communityBanner/' + inkBlob.key.substring(5), // Store the converted image into the 'thumb/' subfolder with the same key as the orig file (by substringing off the 'orig/')
                  access: 'public'
                },
                function (new_InkBlob) { // Success Handler
                  // set the user avatar image by replacing the url with the cloudfront hosted image.
                  $timeout(function() {
                    state.loadingBanner = false;
                  }, 1000);

                  $timeout(function() {
                    var cloudFrontURL = new_InkBlob.url.replace('www.filepicker.io', 'd2kdz49m4u0buf.cloudfront.net');

                    $analytics.eventTrack("Uploaded image", {url: cloudFrontURL});

                    state.createForm.banner = cloudFrontURL;
                    state.bannerChosen = true;
                  });

                }, function(FPERROR) { // Error Handler
                  growl.addErrorMessage('Error uploading image.  Please try again.');
                  $timeout(function() {
                    state.loadingBanner = false;
                  });
                }, function(percent) { // On Progress Handler
                  $timeout(function() {
                    state.loadingBanner = true;
                  });
                }
            );
          });
        }, function (FPError) {
          $timeout(function() {
            state.loadingBanner = false;
            $log.error(FPError);
          })
          if (FPError.code != 101) {
            growl.addErrorMessage('Error uploading image.  Please try again.');
          }
        });
      };

      var pickIcon = function pickIcon() {
        // This will pick a file and store the original file in the 'orig/' subfolder, then convert it to a 200x200 image and store
        // that into the 'thumb/' folder with the same key.
        state.loadingIcon = true;

        var convertSettings = {
          width: 160,
          fit: 'clip',
          rotate: "exif"
        };

        filepicker.pickAndStore({
          mimetype: "image/*",
          multiple: false,
          services: ['COMPUTER', 'FACEBOOK', 'WEBCAM', 'GOOGLE_DRIVE', 'DROPBOX', 'INSTAGRAM', 'FLICKR', 'URL'],
          folders: false
        }, {
          location: "S3",
          path: 'orig/',
          access: 'public'
        }, function (InkBlobs) {
          $.each(InkBlobs, function(index, inkBlob) { // Convert the newly uploaded image to a thumbnail
            filepicker.convert(inkBlob, convertSettings, {
                  location: 'S3',
                  path: 'communityIcon/' + inkBlob.key.substring(5), // Store the converted image into the 'thumb/' subfolder with the same key as the orig file (by substringing off the 'orig/')
                  access: 'public'
                },
                function (new_InkBlob) { // Success Handler
                  // set the user avatar image by replacing the url with the cloudfront hosted image.
                  $timeout(function() {
                    state.loadingIcon = false;
                  }, 1000);

                  $timeout(function() {
                    var cloudFrontURL = new_InkBlob.url.replace('www.filepicker.io', 'd2kdz49m4u0buf.cloudfront.net');

                    $analytics.eventTrack("Uploaded image", {url: cloudFrontURL});

                    state.createForm.icon = cloudFrontURL;
                    state.iconChosen = true;
                  });

                }, function(FPERROR) { // Error Handler
                  growl.addErrorMessage('Error uploading image.  Please try again.');
                  $timeout(function() {
                    state.loadingIcon = false;
                  });
                }, function(percent) { // On Progress Handler
                  $timeout(function() {
                    state.loadingIcon = true;
                  });
                }
            );
          });
        }, function (FPError) {
          $timeout(function() {
            state.loadingIcon = false;
          })
          $log.error(FPError);
          if (FPError.code != 101) {
            growl.addErrorMessage('Error uploading image.  Please try again.');
          }
        });
      };

      var previous = function previous() {
        state.step--;
      }

      var next = function next(form) {
        // Trigger validation flag.
        form.submitted = true;

        // If form is invalid, return and let AngularJS show validation errors.
        if (form.$invalid) {
          return;
        }

        state.step++;
      }

      var state = {
        categoryListOptions: {
          'coworking': 'Co-working',
          'makerspace': 'Makerspace',
          'neighborhood': 'Neighborhood',
          'event': 'Special Event',
          'other': 'Other'
        },

        joiningOptions: {
          'private': 'Private - anyone may request to join',
          'public': 'Public - anyone can join'
        },

        joiningOptionsAdd: {
          private: {
            "moderatorOnly": "Only Moderators may add members",
            "anyone": "Any member may add members"
          },
          public: {
            "anyone": "Any"
          }
        },

        sharingOptions: {
          'yes': 'Yes, on Facebook, Twitter and LinkedIn',
          'no': 'No, I dont want seeds to be shared outside this community'
        },

        membershipOptions: {
          'yes': 'Yes',
          'no': 'No'
        },

        step: 1,

        next: next,

        previous: previous,

        pickIcon: pickIcon,

        pickBanner: pickBanner

      };

      var getNewState = function getNewState(isEditing) {
        state.step = 1;
        state.bannerChosen = isEditing;
        state.iconChosen = isEditing;

        return state;
      }

      return {
        getNewState: getNewState
      }

    }])
    .controller("CreateCommunityCtrl", [ "$scope", '$timeout', '$analytics', '$state', '$log', 'CreateCommunityResource', 'CreateCommunityService', "$rootScope", 'CurrentUser', '$analytics',
      function ($scope, $timeout, $analytics, $state, $log, CreateCommunityResource, CreateCommunityService, $rootScope, CurrentUser, $analytics) {

        $scope.state = CreateCommunityService.getNewState(false);

        $scope.state.createForm = {

          name: "",
          slug: "",
          coreIntention: "",
          category: "",
          joining1: "public",
          joining2: "anyone",
          sharing: "no",
          membershipType: "no",
          membershipAmount: 0,
          banner: "https://d3ngex8q79bk55.cloudfront.net/communities/default/communitiesDefaultBanner.jpg",
          icon: "https://d3ngex8q79bk55.cloudfront.net/communities/default/communitiesDefaultIcon.png"
        };

        $scope.cancel = function cancelCreate() {
          if ($scope.navigated) { // If the rootscope 'navigated' boolean is true, then just go back TODO change to Service method
            history.back();
          } else { // Otherwise, go home
            $state.go('home')
          }
        }

        $scope.submit = function() {

          var newCommunity = new CreateCommunityResource($scope.state.createForm);

          newCommunity.$save(function (value, respHeaders) {
            $analytics.eventTrack('Created new community');
            // Invoke scope function

            $rootScope.currentUser = CurrentUser.get();
            $analytics.eventTrack('createCommunity');
            $state.go("community", {community: value.slug});

          }, function (responseValue) {
            $log.error("error", responseValue);
          });

        }

      }
    ])

    .controller("EditCommunityCtrl", [ "$scope", '$timeout', '$analytics', '$state', '$log', 'CreateCommunityResource', 'CreateCommunityService', '$stateParams', '$rootScope', 'CurrentUser', '$analytics',
      function ($scope, $timeout, $analytics, $state, $log, CreateCommunityResource, CreateCommunityService, $stateParams, $rootScope, CurrentUser, $analytics) {

        $scope.state = CreateCommunityService.getNewState(true);

        var originalSlug;
        $scope.state.createForm = CreateCommunityResource.get({id: $stateParams.id}, function(createForm) {
          // We need to save the original slug in case the user modified the slug, but cancels the changes.
          originalSlug = createForm.slug;
        });

        $scope.cancel = function cancelEdit() {
            $state.go('community', {community: originalSlug});
        }

        $scope.submit = function() {

          var newCommunity = new CreateCommunityResource($scope.state.createForm);

          CreateCommunityResource.update({}, newCommunity, function (value, respHeaders) {
            $analytics.eventTrack('Created new community');
            // Invoke scope function

            $rootScope.currentUser = CurrentUser.get();
            $analytics.eventTrack('editCommunity');
            $state.go("community", {community: value.slug}, {reload: true});
          }, function (responseValue) {
            $log.error("error", responseValue);
          });
        }
      }
    ])

    .factory("CreateCommunityResource", ["$resource",
  function($resource) {
    return $resource("/rest/create/community/:id", null, {
      'update': { method:'PUT' }
    });
  }]);