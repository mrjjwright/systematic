#!/usr/bin/env zsh

# Save current changes if any exist
if ! git diff --quiet HEAD; then
	echo "Stashing current changes..."
	git stash push -m "Auto-stashed for upstream sync"
	STASHED=1
else
	STASHED=0
fi

# Fetch and merge from upstream
echo "\nFetching from upstream..."
git fetch upstream main:main
FETCH_EXIT=$?

if [ $FETCH_EXIT -ne 0 ]; then
	echo "\nFailed to fetch from upstream"
	if [ $STASHED -eq 1 ]; then
		echo "Restoring stashed changes..."
		git stash pop
	fi
	exit 1
fi

echo "\nMerging upstream changes..."
git merge upstream/main
MERGE_EXIT=$?

# If merge was successful and we stashed changes, try to restore them
if [ $MERGE_EXIT -eq 0 ] && [ $STASHED -eq 1 ]; then
	echo "\nMerge successful, restoring stashed changes..."
	git stash pop
	if [ $? -ne 0 ]; then
		echo "\nConflicts occurred while restoring stashed changes"
		echo "Your changes are still in the stash"
		exit 1
	fi
fi

# If merge failed, leave everything as is
if [ $MERGE_EXIT -ne 0 ]; then
	echo "\nMerge failed - please resolve conflicts"
	if [ $STASHED -eq 1 ]; then
		echo "Your changes are saved in the stash"
	fi
	exit 1
fi

echo "\nUpstream sync completed successfully"
