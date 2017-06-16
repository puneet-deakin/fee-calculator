    $(document).ready(function () {

        //Load all the custom label and disclaimer text //or have as initForm
        /*$.get(API_URL + "getCustomText", function (data) {

            var result = JSON.parse(data);

            $("#student_type_label").text(result.label1Text);
            $("#fee_type_label").text(result.label2Text);
            $("#study_mode_label").text(result.label3Text);
            $("#commence_year_label").text(result.label4Text);
            $("#fee_year_label").text(result.label5Text);
            $("#show_type_label").text(result.label6Text);
            $("#course_selection_label").text(result.label7Text);
            $("#disclaimer_text").text(result.disclaimerText1);

            // Delay can be removed
            setTimeout(function () {
                $("#form").show();
                $("#loading_div").hide();
            }, delay500Millis);
        });*/
        $("#form").show();

        //Load all the fee list
        $.get(API_URL + "getFeeYearList", function (data) {

            var result = JSON.parse(data);

            // populate the fee year dropdown
            var option;
            for (i = 0; i < result.length; i++) {
                option = new Option(result[i].DESCRIPTION, result[i].YEAR);
                $('#fee_year').append($(option));
            }
        });

        //Load all the commence year list
        $.get(API_URL + "getCommenceYearList", function (data) {

            var result = JSON.parse(data);

            // populate the commence year dropdown
            var option;
            for (i = 0; i < result.length; i++) {
                option = new Option(result[i].DESCRIPTION, result[i].YEAR);
                $('#commence_year').append($(option));
            }
        });

        // Init the sortable units
        $(function () {
            $("ol.sortable").sortable();
        });

        $("#course_selection").autocomplete({
            minLength: 3, // sets the min amount of keys before search is fired
            maxShowItems: 5,
            select: function (event, ui) {
                calculateCourseFee(ui.item.value);
            }
        });

        // Load all the courses
        $.get(API_URL + "getCourseList", function (data) {

            var result = JSON.parse(data);

            $("#course_versions").val(JSON.stringify(result.full));

            $("#course_selection").autocomplete({
                source: function (request, response) {
                    var results = $.ui.autocomplete.filter(result.list, request.term);
                    response(results.slice(0, 30));
                }
            });
        });

        // Load the unit list
        $.get(API_URL + "getUnitList", function (data) {

            var result = JSON.parse(data);

            //todo once unit api's are done
        });
    });

    // Filters the units once the user types in the search box
    function searchUnits() {
        // Declare variables
        var input, filter, ul, li, i;
        input = document.getElementById('unit_search_input');
        filter = input.value.toUpperCase();
        ul = document.getElementById("unit_list");
        li = ul.getElementsByTagName('li');

        // Loop through all list items, and hide those who don't match the search query
        for (i = 0; i < li.length; i++) {
            span = li[i].getElementsByTagName("span")[0];
            if (span.innerHTML.toUpperCase().indexOf(filter) > -1) {
                li[i].style.display = "";
            } else {
                li[i].style.display = "none";
            }
        }
    }

    // Code for dragging and dropping units.
    // Incomplete. Doco can be found here -> https://johnny.github.io/jquery-sortable/
    var adjustment;
    $("ol.sortable").sortable({
        group: 'units',
        pullPlaceholder: false,
        exclude: '.exclude_sort', // class to exclude
        // controls animation/event on drop
        onDrop: function ($item, container, _super) {
            var $clonedItem = $('<li/>').css({height: 0});
            $item.before($clonedItem);
            $clonedItem.animate({'height': $item.height()});

            // Hide the unit drop box
            $('#dropable_div').css({
                "border-color": "white",
                "border-style": "dashed"
            });

            $item.animate($clonedItem.position(), function () {
                $clonedItem.detach();
                _super($item, container);
            });


            var unitVal = parseFloat($item.find('input').val());
            var prevVal = parseFloat($('#unit_total').text());
            $('#unit_total').text(unitVal + prevVal);

            //calculate the unit costings
            calculateUnitFees();

        },

        // set $item relative to cursor position
        onDragStart: function ($item, container, _super) {
            var offset = $item.offset(),
                pointer = container.rootGroup.pointer;

            // Show the unit drop box
            $('#dropable_div').css({
                "border-color": "#bbbbb8",
                "border-style": "dashed"
            });

            adjustment = {
                left: pointer.left - offset.left,
                top: pointer.top - offset.top
            };

            _super($item, container);
        },
        onDrag: function ($item, position) {
            $item.css({
                left: position.left - adjustment.left,
                top: position.top - adjustment.top
            });
        }
    });

    // group for for non-dragable elements.
    $("ol.dropable").sortable({
        group: 'dropable',
        drag: false
    });

    //todo automate
    const API_URL = "<?php echo $this->base_url;?>";

    const STUDENT_TYPE_DOMESTIC = 'D';
    const STUDENT_TYPE_INTERNATIONAL = 'I';
    var selectedStudentType = STUDENT_TYPE_DOMESTIC;
    var feeTypeDone = true;

    var delay500Millis = 500;

    function CalculateFeesFromForm() {

        // Ensure all
        if( $("#show_type").val() === null || $("#fee_type").val() === null ||
            $("#study_mode").val() === null || $("#commence_year").val() === null ||
            $("#fee_year").val()   === null || $("#student_type").val() === null) {

            ResultClear();

            return;
        }

        // Ensure the course/unit select box is visible
        ShowCourseOrUnitSelection();

        // Calcuate the fee
        calculateCourseFee();
    }

    function ResetStudentType() {

        ResultClear();

        $('#fee_type').val($("#fee_type option:first").val());
    }

    function showCourseCalc() {
        $('#course_calculator').slideDown('fast');
    }

    function hideCourseCalc() {
        $('#course_calculator').slideUp('fast');
    }

    function showUnitCalc() {
        $('#unit_calculator').slideDown('fast');
    }

    function hideUnitCalc() {
        $('#unit_calculator').slideUp('fast');
    }

    function resetForm() {

        $('#show_type').val($("#show_type option:first").val());
        $('#fee_type').val($("#fee_type option:first").val());
        $("#study_mode").val($("#study_mode option:first").val());
        $("#commence_year").val($("#commence_year option:first").val());
        $("#fee_year").val($("#fee_year option:first").val());
        $('#student_type').val($("#student_type option:first").val());

        $("#course_selection").val('');

        $('#show_type_course').attr('disabled', false);
        $('#show_type_none').click();

        ResultClear();
    }

    function ShowCourseOrUnitSelection() {

        if( $('#show_type').val() == "COURSE" ) {
            hideUnitCalc();
            showCourseCalc();
        } else {
            hideCourseCalc();
            showUnitCalc();
        }
    }
    function ResultClear() {
        $('#fee_alert').hide();
        $("#fee_text").text('');
        $('#course_calculator').hide();
        $('#unit_calculator').hide();
        $('#disclaimer_text').hide();
    }

    function ResultShow() {

        $('#fee_alert').show();
        $('#disclaimer_text').show();

    }

    // Based on the student type, the fee type dropdown will vary, possibly other things
    function updateStudentType() {
        ResetStudentType();

        if (!feeTypeDone)
            return;

        var studentTypeId = $("#student_type").val();

        if (studentTypeId == selectedStudentType) {
            return;
        }
        feeTypeDone = false;

        //
        // ** START: Update the fee type dropdown
        //
        // Get control
        var feeTypeControl = $('#fee_type');

        // Store value to set later
        //var prevFeeTypeValue = feeTypeControl.val();

        // Disable dropdown
        var option = new Option('Loading...', '-1');
        feeTypeControl.prop("disabled", true).empty().append($(option));

        option = new Option('Please select...');
        $(option).attr('disabled', true);
        feeTypeControl.append(option);

        // Populate the fee type dropdown
        if (studentTypeId == STUDENT_TYPE_DOMESTIC) {
            option = new Option('Commonwealth Supported Place', 'CSP');
            feeTypeControl.append(option);
        }

        option = new Option('Full Fee Paying Undergraduate', 'FP');
        feeTypeControl.append(option);

        option = new Option('Full Fee Paying Postgraduate', 'FP');
        feeTypeControl.append(option);

        option = new Option('Higher Degree Research', 'FP');
        feeTypeControl.append(option);

        // Timeout for effect / Or dynamically load options from backend
        setTimeout(function () {

            // Set prev val if exists
            //feeTypeControl.val(prevFeeTypeValue);
            $("#fee_type option[value='-1']").remove();
            feeTypeControl.val($("#fee_type option:first").val());
            feeTypeControl.prop("disabled", false);
            selectedStudentType = studentTypeId;
            feeTypeDone = true;
        }, delay500Millis);

        //
        // ** END: Update the fee type dropdown
        //
    }

    function calculateCourseFee(pCourseSelection) {
        // Get form values

        var studentType = $("#student_type").val();
        var feeType = $("#fee_type").val();
        var studyMode = $("#study_mode").val();
        var commenceYear = $("#commence_year").val();
        var feeYear = $("#fee_year").val();
        var showType = $("#show_type").val();

        var courseSelection;

        // Parameter is provided when the item is selected from the course_selection autocomplete
        if (pCourseSelection === undefined)
            courseSelection = $("#course_selection").val();
        else
            courseSelection = pCourseSelection;

        // Ensure an item has been selected
        if (courseSelection.indexOf(' - ') === -1)
            return;

        // Get course code and version
        var courseCode = courseSelection.substring(0, courseSelection.indexOf(' - '));
        var courseVersions = JSON.parse($("#course_versions").val());

        var version = 0;
        $.each(courseVersions, function (i, val) {
            if (i == courseCode) {
                version = val;
                return false;
            }
        });

        if (courseSelection == '') {
            ResultClear();
            return;
        }

        $("#fee_text").text('Loading...');

        var params = {
            studentType: studentType,
            feeType: feeType,
            studyMode: studyMode,
            commenceYear: commenceYear,
            feeYear: feeYear,
            showType: showType,
            courseCode: courseCode,
            courseVersion: version
        };

        $.post(API_URL + "calculateFee", params, function (data) {

            var result = JSON.parse(data);

            if (result.success) {
                var text = 'Estimated tuition fee for ' + feeYear + ' is $' + result.indicativeFee;
                if (result.credentialFee > 0) {
                    text += ' and Credential fee is $' + result.credentialFee + '*';
                }
                else {
                    text += '*';
                }

                $("#fee_text").text(text);
            }
            else {
                $("#fee_text").html(result.error);

                if (result.openUnits) {
                    $('#show_type_course').attr('disabled', true);
                    $("input[name='show_type']:radio:last").prop("checked", true).trigger("click");
                } else {
                    $("#show_type_course").prop("checked", true).trigger("click");
                    $('#show_type_course').attr('disabled', false);
                }
            }

            ResultShow();
        });

        return;
    }

    function calculateUnitFees() {

        // Loop through user_unit_list to get unit cost
        $('#user_unit_list li').each(function (idx, li) {
            var unit = $(li);
            var cost = unit.find('input').val();
        });
    }
