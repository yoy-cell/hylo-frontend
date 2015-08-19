var filepickerUpload = require('../../services/filepickerUpload')

var hasLocalStorage = function () {
  try {
    return 'localStorage' in window && window.localStorage !== null
  } catch (e) {
    return false
  }
}

var controller = function ($scope, currentUser, community, Post, growl, $analytics, $history,
  UserMentions, post, $state, $rootScope, Cache, UserCache) {

  $scope.updatePostDraftStorage = _.debounce(function () {
    if (!hasLocalStorage()) return
    window.localStorage.postDraft = JSON.stringify(_.pick($scope, 'postType', 'title', 'description'))
  }, 200)

  var clearPostDraftStorage = function () {
    if (hasLocalStorage()) delete window.localStorage.postDraft
  }

  $scope.maxTitleLength = 140

  var prefixes = {
    intention: "I'd like to create ",
    offer: "I'd like to share ",
    request: "I'm looking for ",
    chat: ''
  }

  // TODO get multiple placeholders to work
  var placeholders = {
    intention: 'Add more detail about this intention. What help do you need to make it happen?',
    offer: 'Add more detail about this offer. Is it in limited supply? Do you wish to be compensated?',
    request: 'Add more detail about what you need. Is it urgent? What can you offer in exchange?',
    chat: ''
  }

  $scope.switchPostType = function (postType) {
    $scope.postType = postType
    $scope.title = prefixes[postType]
    $scope.descriptionPlaceholder = placeholders[postType]
    $scope.updatePostDraftStorage()
  }

  $scope.close = function () {
    $rootScope.postEditProgress = null
    clearPostDraftStorage()
    if ($history.isEmpty()) {
      $state.go('community.posts', {community: community.slug})
    } else {
      $history.go(-1)
    }
  }

  $scope.addImage = function () {
    $scope.addingImage = true

    function finish () {
      $scope.addingImage = false
      $scope.$apply()
    }

    filepickerUpload({
      path: format('user/%s/seeds', currentUser.id),
      convert: {width: 800, format: 'jpg', fit: 'max', rotate: 'exif'},
      success: function (url) {
        $scope.imageUrl = url
        $scope.imageRemoved = false
        finish()
      },
      failure: () => finish()
    })
  }

  $scope.removeImage = function () {
    delete $scope.imageUrl
    $scope.imageRemoved = true
  }

  var validate = function () {
    var invalidTitle = _.contains(_.values(prefixes), $scope.title.trim())

    // TODO show errors in UI
    if (invalidTitle) window.alert('Please fill in a title')

    return !invalidTitle
  }

  var clearCache = function () {
    Cache.drop('community.posts:' + community.id)
    UserCache.posts.clear(currentUser.id)
    UserCache.allPosts.clear(currentUser.id)
  }

  var update = function (data) {
    post.update(data, function () {
      $analytics.eventTrack('Edit Post', {
        has_mention: $scope.hasMention,
        community_name: community.name,
        community_id: community.id,
        type: $scope.postType
      })
      clearCache()
      clearPostDraftStorage()
      $state.go('post', {community: community.slug, postId: post.id})
      growl.addSuccessMessage('Post updated.')
    }, function (err) {
      $scope.saving = false
      growl.addErrorMessage(err.data)
      $analytics.eventTrack('Edit Post Failed')
    })
  }

  var create = function (data) {
    new Post(data).$save(function () {
      $analytics.eventTrack('Add Post', {has_mention: $scope.hasMention, community_name: community.name, community_id: community.id})
      clearCache()
      $scope.close()
      growl.addSuccessMessage('Post created!')
      clearPostDraftStorage()
    }, function (err) {
      $scope.saving = false
      growl.addErrorMessage(err.data)
      $analytics.eventTrack('Add Post Failed')
    })
  }

  $scope.save = function () {
    if (!validate()) return
    $scope.saving = true

    var data = {
      name: $scope.title,
      description: $scope.description,
      type: $scope.postType,
      communityId: community.id,
      imageUrl: $scope.imageUrl,
      imageRemoved: $scope.imageRemoved
    }
    return ($scope.editing ? update : create)(data)
  }

  $scope.searchPeople = function (query) {
    UserMentions.searchPeople(query, 'community', community.id).$promise.then(function (items) {
      $scope.people = items
    })
  }

  $scope.getPeopleTextRaw = function (user) {
    $analytics.eventTrack('Post: Add New: @-mention: Lookup', {query: user.name})
    $scope.hasMention = true
    return UserMentions.userTextRaw(user)
  }

  if (post) {
    $scope.editing = true
    $scope.switchPostType(post.type)
    $scope.title = post.name
    if (post.media[0]) {
      $scope.imageUrl = post.media[0].url
    }

    if (post.description.substring(0, 3) === '<p>') {
      $scope.description = post.description
    } else {
      $scope.description = format('<p>%s</p>', post.description)
    }
  } else if (hasLocalStorage() && window.localStorage.postDraft) {
    try {
      _.merge($scope, JSON.parse(window.localStorage.postDraft))
    } catch(e) {}
  } else {
    $scope.switchPostType('chat')
  }

  if (!community) {
    $scope.shouldPickCommunity = true
    $scope.communityOptions = _.map(currentUser.memberships, function (membership) {
      return membership.community
    })
    community = $scope.community = $scope.communityOptions[0]

    $scope.pickCommunity = function (id) {
      community = $scope.community = _.find($scope.communityOptions, x => x.id === id)
    }
  }

}

module.exports = function (angularModule) {
  angularModule.controller('PostEditCtrl', controller)
}
